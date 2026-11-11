"""LangGraph orchestration — joins the parts into one bounded pipeline.

Graph shape:

    START -> prepare_context -> +-> generate_nba_candidates --+-> validate_and_rank -> finalize -> END
                                +-> suitability_guard --------+

Both branches run in parallel (LangGraph fan-out / fan-in). Every LLM call has
bounded retries and timeouts; run state is kept in an in-memory store so any
step can be inspected or resumed via GET /api/v1/runs/{run_id}.
"""
import threading
from typing import Any, Dict

from langgraph.graph import END, START, StateGraph

from . import nodes
from .nodes import PipelineState

# Simple in-memory run-state store (per the platform bar: "a simple store is fine")
RUN_STORE: Dict[str, Dict[str, Any]] = {}
_STORE_LOCK = threading.Lock()
_MAX_RUNS = 200


def build_graph():
    graph = StateGraph(PipelineState)
    graph.add_node("prepare_context", nodes.prepare_context)
    graph.add_node("generate_nba_candidates", nodes.generate_nba_candidates)
    graph.add_node("suitability_guard", nodes.suitability_guard)
    graph.add_node("validate_and_rank", nodes.validate_and_rank)
    graph.add_node("finalize", nodes.finalize)

    # Fan-out: both branches run in parallel from prepare_context
    graph.add_edge(START, "prepare_context")
    graph.add_edge("prepare_context", "generate_nba_candidates")
    graph.add_edge("prepare_context", "suitability_guard")

    # Fan-in: both branches converge on validation
    graph.add_edge("generate_nba_candidates", "validate_and_rank")
    graph.add_edge("suitability_guard", "validate_and_rank")

    graph.add_edge("validate_and_rank", "finalize")
    graph.add_edge("finalize", END)
    return graph.compile()


_compiled = None


def get_app():
    global _compiled
    if _compiled is None:
        _compiled = build_graph()
    return _compiled


def run_pipeline(client_context: dict) -> dict:
    """Execute the full NBA pipeline and persist the run state."""
    app = get_app()
    final_state = app.invoke({"client_context": client_context})
    result = final_state.get("_result") or {}

    with _STORE_LOCK:
        if len(RUN_STORE) >= _MAX_RUNS:
            RUN_STORE.pop(next(iter(RUN_STORE)))
        RUN_STORE[result["run_id"]] = {
            "run_id": result["run_id"],
            "status": "COMPLETED",
            "llm_provider": result.get("llm_provider"),
            "generated_nbas": result.get("generated_nbas"),
            "suppressed_nbas": result.get("suppressed_nbas"),
            "pipeline_steps": result.get("pipeline_steps"),
        }
    return result


def get_run_state(run_id: str):
    with _STORE_LOCK:
        return RUN_STORE.get(run_id)
