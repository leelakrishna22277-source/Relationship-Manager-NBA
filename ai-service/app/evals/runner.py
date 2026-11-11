"""Golden-set evaluation runner — measures and gates the AI core.

Scores the pipeline against evals/golden_set.json on:
  * NBA relevance      — expected action types are produced (or none fabricated)
  * Groundedness       — every evidence reference resolves to a real record
  * Guardrail integrity — unsuitable candidates are suppressed by rule id
  * Safety             — injected instructions are flagged, grounding survives

The overall score must clear the gate (default 0.85) or the run FAILS —
a broken AI must not pass quietly. Runs deterministically on the rule engine
by default; set EVALS_USE_LLM=1 to score the live LLM path.
"""
import json
import os
import statistics
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple, cast

from ..config import settings
from ..pipeline import nodes
from ..safety.injection import detect_injection
from ..schemas.client360 import Client360Context

GOLDEN_SET_PATH = Path(__file__).parent / "golden_set.json"


def _load_cases() -> Tuple[List[dict], float]:
    data = json.loads(GOLDEN_SET_PATH.read_text(encoding="utf-8"))
    gate = float(data.get("gate", settings.EVAL_GATE))
    return data["cases"], gate


def _run_pipeline_case(case: dict) -> Dict[str, Any]:
    ctx = Client360Context.model_validate(case["input"])
    from ..pipeline.graph import run_pipeline

    result = run_pipeline(case["input"])
    produced = result["generated_nbas"]
    expected = case["expected"]

    checks: Dict[str, bool] = {}
    details: Dict[str, Any] = {}

    # Relevance
    produced_types = [n["action_type"] for n in produced]
    if expected.get("must_be_empty"):
        checks["relevance"] = len(produced) == 0
        details["produced_types"] = produced_types
    else:
        wanted = expected.get("action_types_any") or []
        checks["relevance"] = any(t in produced_types for t in wanted)
        details["produced_types"] = produced_types

    # Groundedness — every cited record must exist in the input context
    holding_ids = ctx.holding_ids()
    signal_ids = ctx.signal_ids()
    all_resolved = True
    for nba in produced:
        for ev in nba.get("evidence", []):
            rid = ev.get("record_id")
            if ev.get("type") == "HOLDING" and rid not in holding_ids:
                all_resolved = False
            if ev.get("type") == "SIGNAL" and rid not in signal_ids:
                all_resolved = False
    # No invented products
    catalog_ids = {p["id"] for p in case["input"]["product_catalog"]}
    for nba in produced:
        spid = nba.get("suggested_product_id")
        if spid and spid not in catalog_ids:
            all_resolved = False
    checks["groundedness"] = all_resolved
    details["evidence_count"] = sum(len(n.get("evidence", [])) for n in produced)

    # Required evidence coverage (soft: at least one expected ref cited)
    required = expected.get("evidence_record_ids") or []
    if required and produced:
        cited = {ev.get("record_id") for n in produced for ev in n.get("evidence", [])}
        details["required_evidence_cited"] = any(r in cited for r in required)

    # Safety — injected data must be flagged
    if expected.get("injection_must_flag"):
        flagged = any(
            detect_injection(json.dumps(s.get("data", {})))["flagged"] for s in case["input"]["signals"]
        )
        checks["safety"] = flagged
        details["injection_flagged"] = flagged
    else:
        checks["safety"] = True

    return {"case_id": case["id"], "checks": checks, "details": details}


def _run_guardrail_case(case: dict) -> Dict[str, Any]:
    ctx = Client360Context.model_validate(case["input"])
    state = {
        "masked_context": ctx.model_dump(mode="json"),
        "llm_candidates": [case["candidate"]],
        "rule_candidates": [],
        "_eligibility": nodes._compute_eligibility(ctx),
        "suppressed": [],
    }
    update = nodes.validate_and_rank(cast(nodes.PipelineState, state))
    suppressed = update.get("suppressed") or []
    kept = update.get("validated") or []
    expected = case["expected"]

    suppressed_correctly = len(kept) == 0 and len(suppressed) == 1
    rule_hit = False
    if suppressed_correctly:
        failing_rules = {
            r["id"] for r in (suppressed[0].get("rules") or []) if r.get("status") == "FAIL"
        }
        rule_hit = expected.get("suppression_rule") in failing_rules

    return {
        "case_id": case["id"],
        "checks": {"guardrail": suppressed_correctly and rule_hit},
        "details": {
            "suppressed": len(suppressed) > 0,
            "expected_rule": expected.get("suppression_rule"),
            "failing_rules": sorted(
                {r["id"] for r in (suppressed[0].get("rules") or []) if r.get("status") == "FAIL"}
            ) if suppressed else [],
        },
    }


def run_golden_set() -> Dict[str, Any]:
    cases, gate = _load_cases()

    # Deterministic evals by default — score the rule-engine path unless opted in
    use_llm = os.getenv("EVALS_USE_LLM", "").lower() in ("1", "true", "yes")
    previous = settings.LLM_PROVIDER
    if not use_llm:
        settings.LLM_PROVIDER = "fallback"
        import app.llm.provider as llm_provider

        llm_provider._provider_instance = None
        llm_provider._provider_probed = False

    start = time.perf_counter()
    try:
        results: List[Dict[str, Any]] = []
        for case in cases:
            try:
                if case["kind"] == "guardrail":
                    results.append(_run_guardrail_case(case))
                else:
                    results.append(_run_pipeline_case(case))
            except Exception as exc:  # noqa: BLE001 — a crashing case is a failing case
                results.append({"case_id": case["id"], "checks": {"error": False},
                                "details": {"error": str(exc)}})
    finally:
        if not use_llm:
            settings.LLM_PROVIDER = previous

    per_case = []
    for case, result in zip(cases, results):
        passed = all(result["checks"].values())
        per_case.append({**result, "passed": passed})

    categories = {
        "relevance": [c for c in per_case if "relevance" in c["checks"]],
        "groundedness": [c for c in per_case if "groundedness" in c["checks"]],
        "guardrail": [c for c in per_case if "guardrail" in c["checks"]],
        "safety": [c for c in per_case if "safety" in c["checks"]],
    }
    scores = {
        name: round(sum(1 for c in cases_ if all(c["checks"].values())) / len(cases_), 3) if cases_ else None
        for name, cases_ in categories.items()
    }
    numeric = [v for v in scores.values() if v is not None]
    overall = round(statistics.mean(numeric), 3) if numeric else 0.0

    report = {
        "project": "BNK-10",
        "suite": "golden_set",
        "total_cases": len(per_case),
        "passed_cases": sum(1 for c in per_case if c["passed"]),
        "scores": scores,
        "overall_score": overall,
        "gate": gate,
        "gate_passed": overall >= gate,
        "duration_ms": round((time.perf_counter() - start) * 1000, 2),
        "cases": per_case,
    }

    report_path = Path(__file__).parent / "latest_report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main() -> int:
    report = run_golden_set()
    print(json.dumps({
        "overall_score": report["overall_score"],
        "gate": report["gate"],
        "gate_passed": report["gate_passed"],
        "scores": report["scores"],
        "passed_cases": f"{report['passed_cases']}/{report['total_cases']}",
    }, indent=2))
    for case in report["cases"]:
        status = "PASS" if case["passed"] else "FAIL"
        print(f"  [{status}] {case['case_id']}")
        if not case["passed"]:
            print(f"         details: {json.dumps(case['details'])}")
    return 0 if report["gate_passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
