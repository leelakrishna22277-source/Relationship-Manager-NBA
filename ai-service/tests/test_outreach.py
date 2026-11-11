import pytest
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_generate_outreach_email_advisory():
    payload = {
        "client_name": "Aarav Patel",
        "segment": "WEALTH",
        "risk_profile": "MODERATE",
        "action_type": "DEPOSIT_RENEWAL",
        "title": "Maturing Fixed Deposit Reinvestment",
        "reason": "Client has $250,000 maturing in 5 days.",
        "evidence": [
            {"text": "Deposit Maturing: $250,000 maturing in 5 days"},
            {"text": "Risk profile Moderate aligns with Low Risk deposit"}
        ],
        "product_name": "Platinum Fixed Deposit (12M)",
        "expected_return_bps": 725,
        "tone": "ADVISORY",
        "channel": "EMAIL",
    }
    response = client.post("/api/v1/generate-outreach", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "Aarav" in data["body"]
    assert "Platinum Fixed Deposit (12M)" in data["body"]
    assert "7.25%" in data["body"]
    assert data["tone"] == "ADVISORY"
    assert data["channel"] == "EMAIL"
    assert "CONFIDENTIAL RELATIONSHIP MANAGER DRAFT ONLY" in data["disclaimer"]
    assert len(data["grounding_citations"]) >= 2

def test_generate_outreach_call_script_executive():
    payload = {
        "client_name": "Zara Chen",
        "segment": "PRIVATE_BANKING",
        "risk_profile": "AGGRESSIVE",
        "action_type": "PORTFOLIO_REBALANCE",
        "title": "Capital Deployment Opportunity",
        "reason": "Excess liquidity detected.",
        "product_name": "Growth Equity Strategy",
        "tone": "EXECUTIVE",
        "channel": "CALL_SCRIPT",
    }
    response = client.post("/api/v1/generate-outreach", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["channel"] == "CALL_SCRIPT"
    assert data["tone"] == "EXECUTIVE"
    assert "Zara" in data["body"]
    assert "Growth Equity Strategy" in data["body"]

def test_generate_outreach_meeting_brief():
    payload = {
        "client_name": "Vikram Malhotra",
        "segment": "WEALTH",
        "risk_profile": "MODERATE",
        "action_type": "DEPOSIT_RENEWAL",
        "title": "Fixed Income Reinvestment",
        "channel": "MEETING_BRIEF",
    }
    response = client.post("/api/v1/generate-outreach", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["channel"] == "MEETING_BRIEF"
    assert "TALKING POINTS & VALUE PROPOSITION" in data["body"]
