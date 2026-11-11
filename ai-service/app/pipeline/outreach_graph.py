"""LangGraph orchestration workflow for AI Outreach Composer."""
import logging
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from ..config import settings
from ..llm import provider as llm_provider
from ..rag.retriever import PolicyRetriever
from ..safety.injection import sanitize_instruction
from ..schemas.outreach import OutreachDraftRequest, OutreachDraftResponse
from .prompts import OUTREACH_SYSTEM_PROMPT

REGULATORY_DISCLAIMER = (
    "CONFIDENTIAL RELATIONSHIP MANAGER DRAFT ONLY: Not an automated client transmission. "
    "Review, customize, and verify before dispatch."
)

logger = logging.getLogger("bnk10.ai.outreach_pipeline")

PROHIBITED_PHRASES = [
    r"guarantee[sd]?",
    r"100%\s+risk-free",
    r"zero\s+risk",
    r"certain\s+to\s+make\s+money",
    r"once-in-a-lifetime",
    r"act\s+before.*today",
]


class OutreachState(TypedDict, total=False):
    request: dict
    sanitized_instructions: Optional[str]
    injection_flagged: bool
    policy_chunks: List[dict]
    policy_refs: List[str]
    supporting_evidence: List[str]
    draft_subject: str
    draft_body: str
    disclaimer: str
    draft_status: str
    llm_provider: str
    error: Optional[str]
    _result: dict


def prepare_and_sanitize(state: OutreachState) -> dict:
    req = OutreachDraftRequest.model_validate(state.get("request") or {})
    guard = sanitize_instruction(req.custom_instructions or "")

    evidence_citations = []
    if req.evidence:
        for item in req.evidence:
            if isinstance(item, dict):
                text = item.get("text") or item.get("summary") or item.get("details") or item.get("record_id")
                if text:
                    evidence_citations.append(f"Grounding Evidence: {text}")
            elif isinstance(item, str):
                evidence_citations.append(f"Grounding Evidence: {item}")

    if req.product_name:
        evidence_citations.append(f"Proposed Asset: {req.product_name}")
    if req.expected_return_bps:
        evidence_citations.append(f"Indicative Return: {req.expected_return_bps / 100.0:.2f}% p.a.")

    return {
        "sanitized_instructions": guard["text"] if not guard["flagged"] else None,
        "injection_flagged": guard["flagged"],
        "supporting_evidence": evidence_citations,
    }


def retrieve_outreach_policies(state: OutreachState) -> dict:
    req = OutreachDraftRequest.model_validate(state.get("request") or {})
    chunks = PolicyRetriever.get_outreach_policy_context(
        channel=req.channel or "EMAIL",
        tone=req.tone or "ADVISORY",
        product_name=req.product_name,
    )
    policy_refs = [c["source_reference"] for c in chunks] if chunks else ["POL-COMM-2026-V1#Standards"]
    return {
        "policy_chunks": chunks,
        "policy_refs": policy_refs,
    }


def generate_outreach_draft(state: OutreachState) -> dict:
    req = OutreachDraftRequest.model_validate(state.get("request") or {})
    policy_chunks = state.get("policy_chunks") or []
    policy_refs = state.get("policy_refs") or ["POL-COMM-2026-V1#Standards"]

    active_provider = llm_provider.resolve_provider()

    rm_name = req.rm_name or "Relationship Manager"
    bank_name = req.bank_name or "Apex Private Bank"

    prompt_payload = {
        "CLIENT": {"name": req.client_name, "segment": req.segment, "risk_tolerance": req.risk_profile},
        "SENDER": {"rm_name": rm_name, "bank_name": bank_name, "rm_id": req.rm_id},
        "RECOMMENDATION": {"title": req.title, "action_type": req.action_type, "reason": req.reason},
        "PROPOSED_PRODUCT": {"name": req.product_name, "expected_return_bps": req.expected_return_bps},
        "CHANNEL": req.channel or "EMAIL",
        "TONE": req.tone or "ADVISORY",
        "CUSTOM_INSTRUCTIONS": state.get("sanitized_instructions"),
        "SUPPORTING_EVIDENCE": state.get("supporting_evidence") or [],
        "RETRIEVED POLICIES": [
            {"source_reference": c.get("source_reference"), "section": c.get("section"), "summary": c.get("text", "")[:250]}
            for c in policy_chunks
        ],
    }
    last_error = None
    for attempt in range(1, settings.LLM_VALIDATE_RETRIES + 2):
        try:
            import json
            result = active_provider.generate_json(OUTREACH_SYSTEM_PROMPT, json.dumps(prompt_payload, indent=1, default=str))
            content = result.content or {}
            if content.get("body"):
                refs = content.get("policy_source_references") or policy_refs
                return {
                    "draft_subject": content.get("subject") or f"Portfolio Strategy: {req.title}",
                    "draft_body": content["body"],
                    "policy_refs": refs,
                    "llm_provider": result.provider,
                }
        except Exception as exc:
            last_error = exc
            logger.warning("GLM outreach attempt %d failed: %s", attempt, exc)

    # Fallback to deterministic outreach generator whenever LLM is unavailable or fails
    logger.warning("LLM outreach failed (%s); activating deterministic outreach generator fallback", last_error)
    from ..services.outreach_generator import OutreachGenerator
    fallback_resp = OutreachGenerator.generate(req)
    return {
        "draft_subject": fallback_resp.subject,
        "draft_body": fallback_resp.body,
        "policy_refs": policy_refs,
        "llm_provider": "deterministic_fallback",
    }


def validate_outreach(state: OutreachState) -> dict:
    req = OutreachDraftRequest.model_validate(state.get("request") or {})
    subject = state.get("draft_subject") or f"Portfolio Consultation: {req.title}"
    body = state.get("draft_body") or ""
    policy_refs = state.get("policy_refs") or ["POL-COMM-2026-V1#Standards"]
    evidence = state.get("supporting_evidence") or []

    # Compliance check: sanitize prohibited statements
    cleaned_body = body
    for pattern in PROHIBITED_PHRASES:
        cleaned_body = re.sub(pattern, "indicative target", cleaned_body, flags=re.IGNORECASE)

    # Strip any robotic numbered section headers and surrounding quotes
    header_patterns = [
        r"^\s*\d+\.\s*(?:WARM\s+ADVISORY\s+OPENING|SITUATIONAL\s+GROUNDING|STRATEGIC\s+FIT|COLLABORATIVE\s+NEXT\s+STEP|GREETING\s+&\s+CONTEXT|CORE\s+VALUE\s+HOOK|BACKGROUND\s+RATIONALE|CALL\s+TO\s+ACTION)[\s:]*",
        r"^\s*\d+\.\s*[A-Z\s&]+:\s*",
    ]
    for hp in header_patterns:
        cleaned_body = re.sub(hp, "", cleaned_body, flags=re.MULTILINE)
    # Strip quotes around lines/paragraphs
    cleaned_body = re.sub(r'^\s*\"(.*?)\"\s*$', r'\1', cleaned_body, flags=re.MULTILINE)
    cleaned_body = re.sub(r'\n{3,}', '\n\n', cleaned_body).strip()

    rm_name = req.rm_name or "Relationship Manager"
    bank_name = req.bank_name or "Apex Private Bank"
    cleaned_body = (
        cleaned_body.replace("[RM Name]", rm_name)
        .replace("[Relationship Manager Name]", rm_name)
        .replace("[Bank Name]", bank_name)
        .replace("[Bank name]", bank_name)
    )

    response = OutreachDraftResponse(
        client_id=req.client_id,
        nba_id=req.nba_id,
        channel=req.channel or "EMAIL",
        tone=req.tone or "ADVISORY",
        subject=subject,
        body=cleaned_body,
        message=cleaned_body,
        grounding_citations=evidence,
        supporting_evidence=evidence,
        policy_source_references=policy_refs,
        disclaimer=REGULATORY_DISCLAIMER,
        draft_status="DRAFT",
        generated_at=datetime.now(timezone.utc).isoformat(),
    )

    return {
        "draft_body": cleaned_body,
        "draft_status": "DRAFT",
        "_result": response.model_dump(),
    }


def build_outreach_graph():
    graph = StateGraph(OutreachState)
    graph.add_node("prepare_and_sanitize", prepare_and_sanitize)
    graph.add_node("retrieve_outreach_policies", retrieve_outreach_policies)
    graph.add_node("generate_outreach_draft", generate_outreach_draft)
    graph.add_node("validate_outreach", validate_outreach)

    graph.add_edge(START, "prepare_and_sanitize")
    graph.add_edge("prepare_and_sanitize", "retrieve_outreach_policies")
    graph.add_edge("retrieve_outreach_policies", "generate_outreach_draft")
    graph.add_edge("generate_outreach_draft", "validate_outreach")
    graph.add_edge("validate_outreach", END)
    return graph.compile()


_outreach_app = None


def get_outreach_app():
    global _outreach_app
    if _outreach_app is None:
        _outreach_app = build_outreach_graph()
    return _outreach_app


def run_outreach_pipeline(request_dict: dict) -> OutreachDraftResponse:
    app = get_outreach_app()
    final_state = app.invoke({"request": request_dict})
    result_data = final_state.get("_result") or {}
    return OutreachDraftResponse.model_validate(result_data)
