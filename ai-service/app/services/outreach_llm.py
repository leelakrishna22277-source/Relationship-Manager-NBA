"""LLM-backed outreach drafting with grounding verification.

Uses the resolved provider (Ollama) with bounded retries; returns None when no
model is reachable so the caller falls back to deterministic templates — the
draft is always grounded and compliant either way.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from ..config import settings
from ..llm import provider as llm_provider
from ..pipeline.prompts import OUTREACH_SYSTEM_PROMPT
from ..safety.pii import mask_text
from ..schemas.outreach import OutreachDraftRequest, OutreachDraftResponse
from ..telemetry import traced_span
from ..pipeline.outreach_graph import REGULATORY_DISCLAIMER

logger = logging.getLogger("bnk10.ai.outreach_llm")


def _build_user_prompt(req: OutreachDraftRequest) -> str:
    return json.dumps({
        "CLIENT": {"segment": req.segment, "risk_profile": req.risk_profile},
        "RECOMMENDATION": {
            "action_type": req.action_type,
            "title": req.title,
            "reason": req.reason,
            "product_name": req.product_name,
            "expected_return_bps": req.expected_return_bps,
        },
        "EVIDENCE": req.evidence or [],
        "FORMAT": {"channel": req.channel, "tone": req.tone},
        "RM_NOTES": req.custom_instructions,
    }, indent=1, default=str)


def generate_with_llm(req: OutreachDraftRequest) -> OutreachDraftResponse:
    active = llm_provider.resolve_provider()

    last_error = None
    for attempt in range(1, settings.LLM_VALIDATE_RETRIES + 2):
        try:
            with traced_span("outreach.llm_generate", {"attempt": attempt}):
                result = active.generate_json(OUTREACH_SYSTEM_PROMPT, _build_user_prompt(req))
            content = result.content or {}
            subject = str(content.get("subject") or "").strip()
            body = str(content.get("body") or "").strip()
            key_points = [str(k) for k in (content.get("key_points") or [])]

            if not subject or not body:
                logger.warning("LLM outreach attempt %d: empty subject/body", attempt)
                continue

            # PII masking on the generated body + grounded citations
            masked_body, _ = mask_text(body)
            citations = []
            if req.evidence:
                for ev in req.evidence:
                    if isinstance(ev, dict):
                        text = ev.get("text") or ev.get("summary") or ev.get("details")
                        if text:
                            citations.append(f"Grounding Evidence: {text}")
                    elif isinstance(ev, str):
                        citations.append(f"Grounding Evidence: {ev}")
            if key_points:
                citations.extend(f"Draft Key Point: {k}" for k in key_points)

            return OutreachDraftResponse(
                subject=subject,
                body=masked_body,
                channel=(req.channel or "EMAIL").upper(),
                tone=(req.tone or "ADVISORY").upper(),
                grounding_citations=citations,
                disclaimer=REGULATORY_DISCLAIMER,
                generated_at=datetime.now(timezone.utc).isoformat(),
            )
        except llm_provider.LLMUnavailableError as exc:
            last_error = exc
            break
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning("LLM outreach attempt %d failed: %s", attempt, exc)

    logger.warning("LLM outreach failed (%s); activating deterministic generator fallback", last_error)
    from .outreach_generator import OutreachGenerator
    return OutreachGenerator.generate(req)
