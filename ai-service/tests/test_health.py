import time

from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_reports_provider_and_safety_flags():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    assert data["service"] == "bnk-10-ai-service"
    assert "llm_provider" in data and "active" in data["llm_provider"]
    assert data["pii_masking"] is True
    assert data["injection_guard"] is True


def test_health_is_fast():
    start = time.perf_counter()
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert time.perf_counter() - start < 3.0
