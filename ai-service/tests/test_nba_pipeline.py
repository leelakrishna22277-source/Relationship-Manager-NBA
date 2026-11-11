"""End-to-end tests for the LangGraph NBA pipeline (GLM Cloud API path)."""
import json
from pathlib import Path
from typing import cast

import pytest

from app.config import settings
from app.evals.runner import run_golden_set
from app.pipeline import graph as pipeline_graph
from app.pipeline.nodes import PipelineState
from app.schemas.client360 import Client360Context


BASE_CONTEXT = {
    "client": {"id": "cl_t1", "full_name": "Test Client", "segment": "WEALTH", "risk_profile": "MODERATE"},
    "holdings": [
        {"id": "hld_t1_fd", "product_id": "prd_t1_fd", "product_name": "Smart Deposit 3Y",
         "category": "TERM_DEPOSIT", "risk_rating": "LOW", "balance": 150000,
         "maturity_date": "2030-01-01T00:00:00Z"},
    ],
    "signals": [
        {"id": "sig_t1_mat", "type": "DEPOSIT_MATURING",
         "data": {"holding_id": "hld_t1_fd", "days": 14, "amount": 150000},
         "detected_at": "2026-01-01T00:00:00Z"},
    ],
    "product_catalog": [
        {"id": "prd_t1_fd", "name": "Smart Deposit 3Y", "category": "TERM_DEPOSIT",
         "risk_rating": "LOW", "min_investment": 5000, "expected_return_bps": 725},
        {"id": "prd_t1_mf", "name": "Balanced Advantage Fund", "category": "MUTUAL_FUND",
         "risk_rating": "MEDIUM", "min_investment": 10000, "expected_return_bps": 900},
    ],
}


def test_pipeline_generates_grounded_rollover():
    result = pipeline_graph.run_pipeline(BASE_CONTEXT)

    assert result["run_id"]
    assert result["llm_provider"] in ("glm", "api", "deterministic_fallback")
    types = [n["action_type"] for n in result["generated_nbas"]]
    assert "DEPOSIT_ROLLOVER" in types

    rollover = next(n for n in result["generated_nbas"] if n["action_type"] == "DEPOSIT_ROLLOVER")
    cited = {ev["record_id"] for ev in rollover["evidence"]}
    assert "sig_t1_mat" in cited and "hld_t1_fd" in cited
    assert rollover["suitability"]["is_suitable"] is True


def test_pipeline_suppresses_ungrounded_candidates():
    context = json.loads(json.dumps(BASE_CONTEXT))
    context["signals"] = []
    context["holdings"] = []
    result = pipeline_graph.run_pipeline(context)

    assert result["generated_nbas"] == []


def test_pipeline_excludes_completed_and_generates_alternative_product_nba():
    context = json.loads(json.dumps(BASE_CONTEXT))
    # Mark DEPOSIT_ROLLOVER as COMPLETED
    context["completed_actions"] = [
        {
            "action_type": "DEPOSIT_ROLLOVER",
            "status": "COMPLETED",
            "suggested_product_id": "prd_t1_fd",
            "title": "Deposit Rollover",
        }
    ]
    result = pipeline_graph.run_pipeline(context)

    # Must NOT generate DEPOSIT_ROLLOVER again
    action_types = [n["action_type"] for n in result["generated_nbas"]]
    assert "DEPOSIT_ROLLOVER" not in action_types

    # Must generate an alternative NBA for another product/holding
    assert len(result["generated_nbas"]) > 0
    alt_nba = result["generated_nbas"][0]
    assert alt_nba["priority"] in ("LOW", "MEDIUM", "HIGH")
    assert alt_nba["suitability"]["is_suitable"] is True


def test_pipeline_validates_input_schema():
    from fastapi import HTTPException

    from app.main import generate_nba

    bad_context = {"client": {"id": "x"}, "holdings": "not-a-list"}
    with pytest.raises(Exception):
        Client360Context.model_validate(bad_context)


def test_pipeline_records_run_state():
    result = pipeline_graph.run_pipeline(BASE_CONTEXT)
    stored = pipeline_graph.get_run_state(result["run_id"])
    assert stored is not None
    assert stored["status"] == "COMPLETED"
    assert stored["generated_nbas"] == result["generated_nbas"]


def test_pipeline_steps_are_traced_and_bounded():
    result = pipeline_graph.run_pipeline(BASE_CONTEXT)
    step_names = [s["step"] for s in result["pipeline_steps"]]
    assert "prepare_context" in step_names
    assert "generate_nba_candidates" in step_names
    assert "suitability_guard" in step_names
    assert "validate_and_rank" in step_names
    assert "finalize" in step_names


def test_suitability_guard_blocks_high_risk_for_conservative():
    context = json.loads(json.dumps(BASE_CONTEXT))
    context["client"]["risk_profile"] = "CONSERVATIVE"
    context["holdings"][0]["product_name"] = "Secure Fixed Deposit"
    ctx = Client360Context.model_validate(context)

    candidate = {
        "action_type": "STRUCTURED_NOTE",
        "title": "Offer High Yield Structured Note",
        "reason": "High returns",
        "priority": "HIGH",
        "suggested_product_id": "prd_t1_mf",
        "suggested_product_name": "Balanced Advantage Fund",
        "evidence": [{"type": "HOLDING", "record_id": "hld_t1_fd", "summary": "has deposits"}],
        "confidence": 0.9,
        "source": "LLM",
    }
    state = {
        "masked_context": ctx.model_dump(mode="json"),
        "llm_candidates": [candidate],
        "rule_candidates": [],
        "_eligibility": [],
        "suppressed": [],
    }
    update = pipeline_graph.__dict__  # ensure module loaded
    from app.pipeline.nodes import validate_and_rank

    result = validate_and_rank(cast(PipelineState, state))
    assert result["validated"] == []
    assert any("suitability" in s["reason"].lower() for s in result["suppressed"])


def test_evidence_hallucination_is_dropped():
    context = json.loads(json.dumps(BASE_CONTEXT))
    ctx = Client360Context.model_validate(context)

    candidate = {
        "action_type": "PORTFOLIO_REBALANCE",
        "title": "Review portfolio drift",
        "reason": "Drift",
        "priority": "MEDIUM",
        "evidence": [{"type": "SIGNAL", "record_id": "sig_fabricated_999", "summary": "fake"}],
        "confidence": 0.9,
        "source": "LLM",
    }
    state = {
        "masked_context": ctx.model_dump(mode="json"),
        "llm_candidates": [candidate],
        "rule_candidates": [],
        "_eligibility": [],
        "suppressed": [],
    }
    from app.pipeline.nodes import validate_and_rank

    result = validate_and_rank(cast(PipelineState, state))
    assert result["validated"] == []
    assert any("ungrounded" in s["reason"].lower() for s in result["suppressed"])


def test_golden_set_clears_gate():
    report = run_golden_set()
    assert report["gate_passed"], json.dumps(report["cases"], indent=2, default=str)
    assert report["overall_score"] >= report["gate"]
