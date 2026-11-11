"""LangGraph pipeline nodes.

Data flow (per the BRD pipeline):
    prepare_context -> [ generate_nba_candidates || suitability_guard ] -> validate_and_rank -> finalize

* generate_nba_candidates — LLM branch, grounded, bounded retries; falls back to
  the deterministic rule engine when the model is busy/unavailable.
* suitability_guard — deterministic branch that runs IN PARALLEL: computes
  rule-based candidates and the per-product eligibility matrix.
* validate_and_rank — rejects ungrounded/hallucinated output, applies the
  suitability verdicts (the LLM can never override them), ranks and caps.
"""
import json
import logging
import operator
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Annotated, Any, Dict, List, Optional, TypedDict

from ..config import settings
from ..llm import provider as llm_provider
from ..rag.retriever import PolicyRetriever
from ..schemas.client360 import Client360Context
from ..schemas.nba import GeneratedNBA
from ..safety.pii import mask_context
from ..services.suitability import DEFAULT_PROPOSED_AMOUNT, evaluate_suitability
from ..telemetry import traced_span
from .prompts import NBA_SYSTEM_PROMPT

logger = logging.getLogger("bnk10.ai.pipeline")

DEFAULT_POLICY_CHUNKS = [
    {
        "document_id": "POL-SUIT-2026-V1",
        "source_reference": "POL-SUIT-2026-V1#Product_Suitability_Matrix",
        "section": "Product Suitability & Risk Governance",
        "text": "Recommendations must strictly align with the client's verified risk profile, ticket sizing, and concentration limits.",
    },
    {
        "document_id": "POL-DEPO-2026-V1",
        "source_reference": "POL-DEPO-2026-V1#Rollover_Directives",
        "section": "Deposit Maturing and Rollover Directives",
        "text": "Proactively review term deposits maturing within 30 days for reinvestment or rollover into matching products.",
    },
    {
        "document_id": "POL-PORT-2026-V1",
        "source_reference": "POL-PORT-2026-V1#Asset_Allocation",
        "section": "Asset Allocation and Portfolio Diversification",
        "text": "Identify product gaps and rebalance concentrated or idle cash balances into suitable investment strategies.",
    },
]

PRIORITY_RANK = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}


class PipelineState(TypedDict, total=False):
    run_id: str
    client_context: dict
    masked_context: dict
    pii_findings: Annotated[List[dict], operator.add]
    policy_chunks: List[dict]
    policy_refs: List[str]
    llm_candidates: List[dict]
    rule_candidates: List[dict]
    llm_provider: str
    llm_meta: dict
    llm_error: str
    validated: List[dict]
    suppressed: List[dict]
    steps: Annotated[List[dict], operator.add]
    _eligibility: List[dict]
    _result: dict


def _step(name: str, started: float, **extra) -> dict:
    record = {"step": name, "duration_ms": round((time.perf_counter() - started) * 1000, 2)}
    record.update(extra)
    return record


def _same_category_aum(ctx: Client360Context, category: str) -> float:
    target = (category or "").upper()
    return sum(h.balance for h in ctx.holdings if (h.category or "").upper() == target)


def _evaluate_candidate_suitability(ctx: Client360Context, candidate: dict, product: dict | None) -> dict:
    """Suitability verdict for one candidate, mirroring backend semantics.

    DEPOSIT_ROLLOVER is a reinvestment of maturing principal: no incremental
    money moves, and the maturing holding itself is excluded from the duplicate
    check — everything else uses the default 25,000 proposal.
    """
    existing_names = [h.product_name for h in ctx.holdings if h.product_name]
    proposed_amount = DEFAULT_PROPOSED_AMOUNT
    action_type = (candidate.get("action_type") or "").upper()

    # Calculate operational liquid cash from cash/savings holdings + liquid inflow signals
    liquid_cash = sum(
        float(h.balance or 0.0) for h in ctx.holdings
        if (h.category or "").upper() in ("CASH", "SAVINGS", "LIQUID", "CURRENT")
        or "savings" in (h.product_name or "").lower()
        or "cash" in (h.product_name or "").lower()
    )
    inflow_signal = next((s for s in ctx.signals if "INFLOW" in (s.type or "").upper()), None)
    if inflow_signal and inflow_signal.data:
        try:
            liquid_cash += float(inflow_signal.data.get("amount") or 0.0)
        except (ValueError, TypeError):
            pass

    target_name = (product.get("name") if product else candidate.get("suggested_product_name")) or ""
    existing_holding = next(
        (h for h in ctx.holdings if target_name and h.product_name and h.product_name.lower() == target_name.lower()),
        None
    )
    existing_balance = float(existing_holding.balance or 0.0) if existing_holding else 0.0

    maturing_balance = 0.0
    if action_type == "DEPOSIT_ROLLOVER":
        proposed_amount = 0.0
        maturing_holding_id = next(
            (ev.get("record_id") for ev in candidate.get("evidence", [])
             if ev.get("type") == "HOLDING"),
            None,
        )
        maturing = next((h for h in ctx.holdings if h.id == maturing_holding_id), None)
        if not maturing:
            maturing = next((h for h in ctx.holdings if (h.category in ("TERM_DEPOSIT", "FIXED_INCOME", "DEPOSITS") or "deposit" in (h.product_name or "").lower())), None)
        if maturing:
            maturing_balance = float(maturing.balance or 0.0)
            if maturing.product_name:
                existing_names = [n for n in existing_names if n != maturing.product_name]

    if product:
        return evaluate_suitability(
            client_risk_profile=ctx.client.risk_profile,
            product_risk_rating=product.get("risk_rating") or "LOW",
            total_aum=ctx.total_aum,
            existing_product_names=existing_names,
            target_product_name=product.get("name") or candidate.get("suggested_product_name") or "",
            min_threshold=float(product.get("min_investment") or 0.0),
            proposed_amount=proposed_amount,
            action_type=action_type,
            liquid_cash=liquid_cash,
            existing_holding_balance=existing_balance,
            monthly_installment=DEFAULT_PROPOSED_AMOUNT,
            maturing_balance=maturing_balance,
        )

    # No concrete product: evaluate the recommendation title itself (backend
    # evaluateNbaSuitability semantics — inferred risk from the action title).
    title = candidate.get("title") or ""
    inferred_risk = "LOW"
    if "Structured" in title or "structured" in title:
        inferred_risk = "HIGH"
    elif "Fund" in title or "Growth" in title:
        inferred_risk = "MEDIUM"
    return evaluate_suitability(
        client_risk_profile=ctx.client.risk_profile,
        product_risk_rating=inferred_risk,
        total_aum=ctx.total_aum,
        existing_product_names=existing_names,
        target_product_name=title,
        proposed_amount=proposed_amount,
        action_type=action_type,
        liquid_cash=liquid_cash,
        existing_holding_balance=existing_balance,
        monthly_installment=DEFAULT_PROPOSED_AMOUNT,
        maturing_balance=maturing_balance,
    )


# ---------------------------------------------------------------------------
# Node 1 — prepare context (schema validation + PII masking)
# ---------------------------------------------------------------------------

def prepare_context(state: PipelineState) -> dict:
    start = time.perf_counter()
    with traced_span("pipeline.prepare_context"):
        ctx = Client360Context.model_validate(state.get("client_context") or {})
        masked, findings = mask_context(ctx.model_dump(mode="json"))

        # Policy RAG retrieval from ChromaDB
        policy_chunks = PolicyRetriever.get_nba_policy_context(
            client_risk_profile=ctx.client.risk_profile,
            signals=[s.model_dump() for s in ctx.signals],
            product_catalog=[p.model_dump() for p in ctx.product_catalog],
        )
        if not policy_chunks:
            policy_chunks = list(DEFAULT_POLICY_CHUNKS)
        policy_refs = [c["source_reference"] for c in policy_chunks]

        return {
            "run_id": state.get("run_id") or uuid.uuid4().hex[:12],
            "masked_context": masked,
            "pii_findings": findings,
            "policy_chunks": policy_chunks,
            "policy_refs": policy_refs,
            "steps": [_step("prepare_context", start, signals=len(ctx.signals), holdings=len(ctx.holdings), policy_chunks=len(policy_chunks))],
        }


# ---------------------------------------------------------------------------
# Node 2a — LLM branch: grounded NBA generation (bounded retries)
# ---------------------------------------------------------------------------

def _context_prompt(ctx: Client360Context, policy_chunks: Optional[List[dict]] = None) -> str:
    catalog = [
        {"id": p.id, "name": p.name, "category": p.category, "risk_rating": p.risk_rating,
         "min_investment": p.min_investment, "expected_return_bps": p.expected_return_bps}
        for p in ctx.product_catalog
    ]
    holdings = [
        {"id": h.id, "product_name": h.product_name, "category": h.category,
         "risk_rating": h.risk_rating, "balance": h.balance,
         "maturity_date": str(h.maturity_date) if h.maturity_date else None}
        for h in ctx.holdings
    ]
    signals = [
        {"id": s.id, "type": s.type, "data": s.data, "detected_at": str(s.detected_at) if s.detected_at else None}
        for s in ctx.signals
    ]
    payload = {
        "CLIENT": {"id": ctx.client.id, "segment": ctx.client.segment, "risk_tolerance": ctx.client.risk_profile},
        "TOTAL_AUM": ctx.total_aum,
        "HOLDINGS": holdings,
        "SIGNALS": signals,
        "PRODUCT CATALOG": catalog,
    }
    if ctx.completed_actions:
        payload["COMPLETED_ACTIONS_DO_NOT_REPEAT"] = [
            {"action_type": a.action_type, "status": a.status, "suggested_product_id": a.suggested_product_id}
            for a in ctx.completed_actions
        ]
    if policy_chunks:
        payload["RETRIEVED POLICIES"] = [
            {"source_reference": c.get("source_reference"), "section": c.get("section"), "summary": c.get("text", "")[:300]}
            for c in policy_chunks
        ]
    return json.dumps(payload, indent=1, default=str)


def _validated_llm_candidates(raw: Any) -> List[GeneratedNBA]:
    parsed: List[GeneratedNBA] = []
    for item in (raw or [])[: settings.NBA_MAX_CANDIDATES]:
        try:
            parsed.append(GeneratedNBA.model_validate(item))
        except Exception as exc:  # noqa: BLE001 — invalid candidate skipped, not fatal
            logger.warning("Invalid LLM candidate dropped: %s", exc)
    return parsed


def _format_rag_policy_citation(chunk: dict) -> dict:
    raw_text = chunk.get("text", "")
    cleaned = re.sub(r"\[.*?\]", "", raw_text)
    cleaned = re.sub(r"##+\s*", "", cleaned)
    cleaned = re.sub(r"\*\*.*?\*\*", "", cleaned)
    cleaned = " ".join(cleaned.split())
    excerpt = cleaned[:240] + ("..." if len(cleaned) > 240 else "")
    section = (chunk.get("section") or "Institutional Policy Directive").lstrip("#").strip()
    doc_id = chunk.get("document_id") or "POL-SUIT-2026-V1"
    return {
        "type": "POLICY",
        "record_id": chunk.get("source_reference") or doc_id,
        "summary": f"{doc_id} § {section}",
        "details": excerpt,
    }


def generate_nba_candidates(state: PipelineState) -> dict:
    start = time.perf_counter()
    ctx = Client360Context.model_validate(state.get("masked_context") or {})
    policy_chunks = state.get("policy_chunks") or list(DEFAULT_POLICY_CHUNKS)
    policy_refs = state.get("policy_refs") or [c["source_reference"] for c in policy_chunks]
    rag_policy_citations = [_format_rag_policy_citation(ch) for ch in policy_chunks]

    active_provider = llm_provider.resolve_provider()

    last_error = None
    for attempt in range(1, settings.LLM_VALIDATE_RETRIES + 2):  # bounded: 1 + 2 retries
        try:
            with traced_span("pipeline.llm_generate", {"attempt": attempt, "provider": getattr(active_provider, "name", "cloud_api")}):
                result = active_provider.generate_json(NBA_SYSTEM_PROMPT, _context_prompt(ctx, policy_chunks))
            candidates = [c.model_dump() for c in _validated_llm_candidates((result.content or {}).get("nbas"))]
            if candidates:
                for c in candidates:
                    c["client_id"] = ctx.client.id
                    c["evidence_ids"] = [ev.get("record_id") for ev in c.get("evidence", []) if ev.get("record_id")]
                    c["policy_source_references"] = c.get("policy_source_references") or policy_refs
                    c["policy_citations"] = rag_policy_citations
                    c["priority_proposal"] = c.get("priority", "MEDIUM")
                return {
                    "llm_provider": result.provider,
                    "llm_candidates": candidates,
                    "llm_meta": result.to_meta(),
                    "steps": [_step("generate_nba_candidates", start, provider=result.provider,
                                    attempt=attempt, candidates=len(candidates),
                                    prompt_tokens=result.prompt_tokens,
                                    completion_tokens=result.completion_tokens)],
                }
            else:
                logger.warning("LLM returned 0 candidates on attempt %d", attempt)
        except llm_provider.LLMUnavailableError as exc:
            last_error = str(exc)
            break  # provider down — do not spin
        except Exception as exc:  # noqa: BLE001
            last_error = f"{type(exc).__name__}: {exc}"

    # Fallback to deterministic rule engine whenever LLM is unavailable or returns 0 valid candidates
    logger.warning("LLM candidate generation failed (%s); activating deterministic rule engine fallback", last_error)
    from ..services.nba_rule_engine import generate_candidates as rule_generate
    fallback_raw = rule_generate(ctx)
    fallback_candidates = [c.model_dump() for c in fallback_raw]
    for c in fallback_candidates:
        c["client_id"] = ctx.client.id
        c["evidence_ids"] = [ev.get("record_id") for ev in c.get("evidence", []) if ev.get("record_id")]
        c["policy_source_references"] = c.get("policy_source_references") or policy_refs
        c["policy_citations"] = rag_policy_citations
        c["priority_proposal"] = c.get("priority", "MEDIUM")

    return {
        "llm_provider": "deterministic_fallback",
        "llm_candidates": fallback_candidates,
        "llm_meta": {"fallback": True, "reason": str(last_error or "No candidates from LLM")},
        "steps": [_step("generate_nba_candidates", start, provider="deterministic_fallback",
                        candidates=len(fallback_candidates), error=str(last_error))],
    }


# ---------------------------------------------------------------------------
# Node 2b — Suitability Guard branch (deterministic, runs in parallel)
# ---------------------------------------------------------------------------

def _compute_eligibility(ctx: Client360Context) -> List[dict]:
    results = []
    for product in ctx.product_catalog:
        verdict = _evaluate_candidate_suitability(
            ctx,
            {"action_type": "PRODUCT_GAP", "title": product.name},
            product.model_dump(),
        )
        verdict["product_id"] = product.id
        results.append(verdict)
    return results


def suitability_guard(state: PipelineState) -> dict:
    start = time.perf_counter()
    ctx = Client360Context.model_validate(state.get("masked_context") or {})
    with traced_span("pipeline.suitability_guard"):
        eligibility = _compute_eligibility(ctx)
    return {
        "rule_candidates": [],
        "_eligibility": eligibility,
        "steps": [_step("suitability_guard", start, products_evaluated=len(eligibility))],
    }


# ---------------------------------------------------------------------------
# Node 3 — fan-in: validate grounding, apply suitability, rank
# ---------------------------------------------------------------------------

def _clean_simple_reason(text: str) -> str:
    if not text:
        return text
    replacements = [
        (r",?\s*creating an imminent liquidity event that requires proactive rollover to avoid an uninvested cash position\.?", ". Reinvesting now locks in high rates and keeps funds earning safely."),
        (r"creating an imminent liquidity event.*?to avoid an uninvested cash position\.?", "Reinvesting now keeps money earning steadily."),
        (r"to avoid an uninvested cash position\.?", "so funds do not sit idle."),
        (r"an uninvested cash position", "idle funds"),
        (r"an imminent liquidity event", "an upcoming maturity"),
        (r"proactive rollover", "reinvestment"),
        (r"a proactive call ensures reinvestment instructions are captured before maturity and prevents an unplanned cash drag\.?", "reinvesting now locks in high interest and keeps funds earning safely."),
        (r"ensures reinvestment instructions are captured before maturity and prevents an unplanned cash drag\.?", "locks in current high rates and keeps your money growing safely."),
        (r"prevents an unplanned cash drag\.?", "keeps funds earning steadily without sitting idle."),
        (r"cash drag", "idle cash"),
        (r"The discussion also provides an opportunity to reconfirm the client's validated \w+ risk profile before executing any allocation changes\.?", "This matches the client's risk profile and keeps capital safe."),
        (r"reconfirm the client's validated \w+ risk profile before executing any allocation changes\.?", "matches the client's risk profile."),
        (r"reconfirm the client's validated \w+ risk profile", "matches the client's risk profile"),
        (r"mitigates idle liquidity drag\.?", "puts idle cash to work."),
        (r"proactive rollover protects yield and avoids an idle-cash gap\.?", "reinvesting now locks in current high rates and keeps your money growing."),
        (r"ensures reinvestment instructions are captured before maturity", "allows timely reinvestment"),
    ]
    cleaned = text
    for pattern, repl in replacements:
        cleaned = re.sub(pattern, repl, cleaned, flags=re.IGNORECASE)
    return " ".join(cleaned.split()).strip()


def _clean_simple_title(title: str) -> str:
    if not title:
        return title
    title = re.sub(r"^Discuss reinvestment options —\s*", "Renew ", title, flags=re.IGNORECASE)
    title = re.sub(r"Review portfolio drift \((.*?)\) and rebalance allocation", r"Rebalance Portfolio (\1)", title, flags=re.IGNORECASE)
    return title.strip()


def validate_and_rank(state: PipelineState) -> dict:
    start = time.perf_counter()
    ctx = Client360Context.model_validate(state.get("masked_context") or {})
    holding_ids = ctx.holding_ids()
    signal_ids = ctx.signal_ids()
    products_by_id = {p.id: p for p in ctx.product_catalog}
    eligibility = {v["product_id"]: v for v in (state.get("_eligibility") or [])}

    suppressed: List[dict] = []
    merged: Dict[tuple, dict] = {}

    for candidate in list(state.get("llm_candidates") or []):
        # 1. Evidence must reference real records — invented evidence is dropped
        valid_evidence = [
            ev for ev in candidate.get("evidence", [])
            if (ev.get("type") == "HOLDING" and ev.get("record_id") in holding_ids)
            or (ev.get("type") == "SIGNAL" and ev.get("record_id") in signal_ids)
        ]
        candidate["evidence"] = valid_evidence

        # 2. Ungrounded candidates are rejected outright
        if not valid_evidence:
            suppressed.append({"candidate": candidate, "reason": "No verifiable evidence — rejected as ungrounded"})
            continue

        # 3. Suggested products must exist in the catalog
        product = products_by_id.get(candidate.get("suggested_product_id") or "")
        if candidate.get("suggested_product_id") and not product:
            suppressed.append({"candidate": candidate, "reason": "Suggested product not in catalog — possible hallucination"})
            continue

        # 3b. Suppress actions and products that have already been completed or accepted by the Relationship Manager
        action_type = candidate.get("action_type")
        if action_type in ctx.completed_action_types:
            suppressed.append({
                "candidate": candidate,
                "reason": "Action opportunity already completed or accepted by Relationship Manager",
            })
            continue

        suggested_pid = candidate.get("suggested_product_id")
        if suggested_pid and suggested_pid in ctx.completed_product_ids:
            suppressed.append({
                "candidate": candidate,
                "reason": "Product recommendation already actioned or completed for this client",
            })
            continue

        # 4. Suitability guard — deterministic, cannot be overridden by the LLM
        verdict = eligibility.get(candidate.get("suggested_product_id") or "")
        if product:
            verdict = _evaluate_candidate_suitability(ctx, candidate, product.model_dump())
        else:
            verdict = _evaluate_candidate_suitability(ctx, candidate, None)
        candidate["suitability"] = verdict

        if verdict and not verdict.get("is_suitable", True):
            suppressed.append({
                "candidate": candidate,
                "reason": "Failed suitability guard: recommendation does not comply with investor risk mandate or portfolio guardrails",
                "rules": verdict.get("rules", []),
            })
            continue

        # 5. Attach structured metadata required by NBA specification
        candidate["client_id"] = ctx.client.id
        candidate["title"] = _clean_simple_title(candidate.get("title") or "")
        candidate["reason"] = _clean_simple_reason(candidate.get("reason") or "")
        candidate["evidence_ids"] = [ev.get("record_id") for ev in valid_evidence if ev.get("record_id")]
        candidate["policy_source_references"] = candidate.get("policy_source_references") or state.get("policy_refs") or ["POL-SUIT-2026-V1#Product_Suitability_Matrix"]
        candidate["policy_citations"] = [_format_rag_policy_citation(ch) for ch in (state.get("policy_chunks") or [])]
        candidate["priority_proposal"] = candidate.get("priority", "MEDIUM")
        first_rule = (verdict.get("rules") or [{}])[0] if verdict and verdict.get("rules") else {}
        candidate["suitability_explanation"] = first_rule.get("details", f"Safe investment matching the client's {ctx.client.risk_profile.lower()} risk profile.")
        candidate["suggested_next_step"] = candidate.get("suggested_next_step") or "Call or message client to review terms and discuss this opportunity."

        # 6. Deduplicate + rank
        key = (candidate.get("action_type"), candidate.get("suggested_product_id"))
        existing = merged.get(key)
        if existing is None or float(candidate.get("confidence", 0)) > float(existing.get("confidence", 0)):
            merged[key] = candidate

    ranked = sorted(
        merged.values(),
        key=lambda c: (PRIORITY_RANK.get(c.get("priority", "LOW"), 3), -float(c.get("confidence", 0))),
    )[: settings.NBA_MAX_FINAL]

    return {
        "validated": ranked,
        "suppressed": suppressed,
        "steps": [_step("validate_and_rank", start, kept=len(ranked), suppressed=len(suppressed))],
    }


# ---------------------------------------------------------------------------
# Node 4 — finalize
# ---------------------------------------------------------------------------

def finalize(state: PipelineState) -> dict:
    start = time.perf_counter()
    step_record = _step("finalize", start)
    client_obj = (state.get("masked_context") or state.get("client_context") or {}).get("client") or {}
    client_id = client_obj.get("id") if isinstance(client_obj, dict) else getattr(client_obj, "id", "")
    result = {
        "run_id": state.get("run_id"),
        "client_id": client_id or "",
        "generated_nbas": state.get("validated") or [],
        "suppressed_nbas": state.get("suppressed") or [],
        "llm_provider": state.get("llm_provider") or "glm",
        "llm_meta": state.get("llm_meta") or {},
        "pipeline_steps": list(state.get("steps") or []) + [step_record],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return {"_result": result, "steps": [step_record]}
