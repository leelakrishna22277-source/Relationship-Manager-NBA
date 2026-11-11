"""BNK-10 AI service — FastAPI entrypoint.

Endpoints:
  GET  /api/v1/health          — liveness + active LLM provider
  POST /api/v1/generate-nba    — LangGraph pipeline: grounded NBA generation
                                 with parallel suitability guard
  POST /api/v1/generate-outreach — LLM outreach drafting (grounded + guarded)
  GET  /api/v1/runs/{run_id}   — persisted pipeline run state
  POST /api/v1/evals/run       — golden-set evaluation; fails below the gate
"""
import logging
import time
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .llm import provider as llm_provider
from .pipeline import graph as pipeline_graph
from .safety.injection import sanitize_instruction
from .schemas.client360 import Client360Context
from .schemas.outreach import OutreachDraftRequest, OutreachDraftResponse
from .schemas.nba import NBAPipelineResult
from .telemetry import get_tracer, setup_tracing

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("bnk10.ai")

app = FastAPI(
    title="BNK-10 NBA AI Service",
    description="Grounded NBA generation (LangGraph) + guarded outreach drafting for Relationship Managers",
    version="2.0.0",
)

@app.middleware("http")
async def trace_and_log_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or f"req-py-{int(time.time() * 1000)}"
    start_time = time.time()
    logger.info(f"[AI-TRACE IN] {request.method} {request.url.path} | requestId={request_id}")
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000
    response.headers["X-Request-Id"] = request_id
    logger.info(
        f"[AI-TRACE OUT] {request.method} {request.url.path} -> {response.status_code} in {duration_ms:.2f}ms | requestId={request_id}"
    )
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type", "X-Request-Id"],
)

setup_tracing()


class HealthResponse:
    pass


from pydantic import BaseModel


class HealthOut(BaseModel):
    status: str
    service: str
    version: str
    llm_provider: dict
    pii_masking: bool
    injection_guard: bool
    timestamp: float


@app.get("/api/v1/health", response_model=HealthOut)
def health_check():
    return HealthOut(
        status="UP",
        service="bnk-10-ai-service",
        version="2.0.0",
        llm_provider=llm_provider.provider_status(),
        pii_masking=settings.PII_MASKING_ENABLED,
        injection_guard=settings.INJECTION_GUARD_ENABLED,
        timestamp=time.time(),
    )


@app.post("/api/v1/generate-nba", response_model=NBAPipelineResult)
def generate_nba(context: Client360Context):
    """Run the LangGraph NBA pipeline: aggregate -> generate || guard -> validate -> finalize."""
    tracer = get_tracer()
    with tracer.start_as_current_span("api.generate_nba") as span:
        span.set_attribute("client.id", context.client.id)
        span.set_attribute("signals", len(context.signals))
        try:
            result = pipeline_graph.run_pipeline(context.model_dump(mode="json"))
        except Exception as exc:  # noqa: BLE001
            logger.exception("NBA pipeline failed")
            raise HTTPException(status_code=500, detail=f"NBA pipeline failed: {exc}") from exc
        return result


@app.get("/api/v1/runs/{run_id}")
def get_run(run_id: str):
    run = pipeline_graph.get_run_state(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@app.post("/api/v1/generate-outreach", response_model=OutreachDraftResponse)
def generate_outreach(request: OutreachDraftRequest):
    """Grounded outreach draft generated via LangGraph workflow + RAG policy retrieval."""
    tracer = get_tracer()
    with tracer.start_as_current_span("api.generate_outreach") as span:
        span.set_attribute("client.id", request.client_name)
        try:
            from .pipeline.outreach_graph import run_outreach_pipeline
            return run_outreach_pipeline(request.model_dump())
        except Exception as exc:
            logger.exception("Outreach LangGraph pipeline failed: %s", exc)
            raise HTTPException(status_code=500, detail=f"Outreach generation failed: {exc}") from exc


@app.get("/api/v1/policies/query")
def query_policies(query: str, k: int = 3, doc_type: Optional[str] = None):
    """Retrieve relevant policy chunks semantically from ChromaDB knowledge base."""
    from .rag.retriever import PolicyRetriever
    return {
        "query": query,
        "doc_type": doc_type,
        "results": PolicyRetriever.query_policies(query=query, k=k, doc_type=doc_type),
    }


@app.post("/api/v1/evals/run")
@app.post("/api/v1/evals/ragas/run")
def run_evals():
    """Run the official RAGAS evaluation suite on ChromaDB policy knowledge base. Fails (422) below gate."""
    from .evals.ragas_eval import run_ragas_evaluation

    report = run_ragas_evaluation()
    if not report["gate_passed"]:
        raise HTTPException(status_code=422, detail={"message": "RAGAS eval gate failed", "report": report})
    return report


@app.get("/api/v1/evals/report")
@app.get("/api/v1/evals/ragas/report")
def get_ragas_report():
    """Get the latest saved RAGAS evaluation report."""
    import json
    from .evals.ragas_eval import REPORT_PATH, run_ragas_evaluation

    if not REPORT_PATH.exists():
        return run_ragas_evaluation()
    return json.loads(REPORT_PATH.read_text(encoding="utf-8"))
