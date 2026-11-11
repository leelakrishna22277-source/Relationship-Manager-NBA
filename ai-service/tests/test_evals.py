"""Eval harness tests — the golden set must clear the gate inside pytest too."""
import json

from app.evals.runner import run_golden_set


def test_golden_set_report_structure():
    report = run_golden_set()
    assert report["total_cases"] >= 6, "Platform bar requires 6-10 golden cases"
    assert set(report["scores"]) == {"relevance", "groundedness", "guardrail", "safety"}
    assert 0.0 <= report["overall_score"] <= 1.0


def test_golden_set_gate_passes():
    report = run_golden_set()
    failing = [c for c in report["cases"] if not c["passed"]]
    assert report["gate_passed"], f"Failing cases: {json.dumps(failing, indent=2, default=str)}"
