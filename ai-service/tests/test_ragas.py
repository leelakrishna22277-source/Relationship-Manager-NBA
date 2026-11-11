"""Unit and automated gate tests for BNK-10 ChromaDB Policy RAGAS Evaluation."""
import json
from pathlib import Path

from app.evals.ragas_eval import (
    GOLDEN_SET_PATH,
    REPORT_PATH,
    run_ragas_evaluation,
)


def test_ragas_golden_cases_count():
    """Platform bar requires 6-10 golden test cases for RAG evaluation."""
    data = json.loads(GOLDEN_SET_PATH.read_text(encoding="utf-8"))
    cases = data.get("cases", [])
    assert 6 <= len(cases) <= 12, f"Expected 6-12 cases, got {len(cases)}"


def test_ragas_evaluation_metrics_and_schema():
    """Verifies that RAGAS evaluation produces valid scores across the 4 core metrics."""
    report = run_ragas_evaluation()

    assert report["project"] == "BNK-10"
    assert "RAGAS" in report["evaluation_framework"]
    assert report["total_cases"] >= 6
    assert report["passed_cases"] >= 6

    metrics = report["metrics_summary"]
    for expected_metric in ("faithfulness", "answer_relevance", "context_precision", "context_recall"):
        assert expected_metric in metrics, f"Missing metric: {expected_metric}"
        assert 0.0 <= metrics[expected_metric] <= 1.0, f"Score out of bounds for {expected_metric}"

    assert 0.0 <= report["overall_score"] <= 1.0


def test_ragas_quality_gate_passes():
    """Asserts that the RAG pipeline clears the quality gate (settings.EVAL_GATE)."""
    report = run_ragas_evaluation()
    failing_cases = [c for c in report["cases"] if not c["passed"]]
    assert report["gate_passed"], (
        f"RAGAS eval failed quality gate {report['gate']}. Overall: {report['overall_score']:.4f}. "
        f"Failing cases: {json.dumps(failing_cases, indent=2)}"
    )
    assert report["overall_score"] >= report["gate"]


def test_ragas_report_file_persisted():
    """Asserts that the evaluation report JSON is written to disk."""
    assert REPORT_PATH.exists(), f"Report file not found at {REPORT_PATH}"
    report_data = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    assert report_data["project"] == "BNK-10"
    assert report_data["gate_passed"] is True


def test_ragas_fastapi_endpoints():
    """Asserts that FastAPI exposes RAGAS evaluation endpoints."""
    from starlette.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    # Test GET report
    get_res = client.get("/api/v1/evals/ragas/report")
    assert get_res.status_code == 200
    report = get_res.json()
    assert report["project"] == "BNK-10"
    assert report["gate_passed"] is True

    # Test POST run
    post_res = client.post("/api/v1/evals/ragas/run")
    assert post_res.status_code == 200
    run_data = post_res.json()
    assert run_data["gate_passed"] is True
    assert run_data["overall_score"] >= run_data["gate"]

