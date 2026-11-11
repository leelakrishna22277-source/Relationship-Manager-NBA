from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class OutreachDraftRequest(BaseModel):
    client_id: Optional[str] = Field(None, description="Unique client identifier")
    nba_id: Optional[str] = Field(None, description="Unique NBA recommendation identifier")
    client_name: str = Field(..., description="Full name of client")
    rm_id: Optional[str] = Field(None, description="Relationship manager ID")
    rm_name: Optional[str] = Field(None, description="Full name of relationship manager")
    bank_name: Optional[str] = Field("Apex Private Bank", description="Bank name")
    segment: str = Field(..., description="Client wealth segment (e.g. PREMIER, HNI, RETAIL)")
    risk_profile: str = Field(..., description="Client risk profile (e.g. CONSERVATIVE, MODERATE, AGGRESSIVE)")
    action_type: str = Field(..., description="Action type code (e.g. DEPOSIT_ROLLOVER, PORTFOLIO_REBALANCE)")
    title: str = Field(..., description="Recommendation title")
    reason: Optional[str] = Field(None, description="Trigger reason and background")
    evidence: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Grounding evidence records")
    product_name: Optional[str] = Field(None, description="Proposed product name")
    product_category: Optional[str] = Field(None, description="Category of proposed product")
    expected_return_bps: Optional[int] = Field(None, description="Basis points return")
    tone: Optional[str] = Field("ADVISORY", description="Tone: ADVISORY, PROFESSIONAL, or EXECUTIVE")
    channel: Optional[str] = Field("EMAIL", description="Channel: EMAIL, CALL_SCRIPT, or MEETING_BRIEF")
    custom_instructions: Optional[str] = Field(None, description="RM specific customization notes")


class OutreachDraftResponse(BaseModel):
    client_id: Optional[str] = None
    nba_id: Optional[str] = None
    channel: str
    tone: Optional[str] = "ADVISORY"
    subject: str
    body: str
    message: Optional[str] = None
    grounding_citations: List[str] = Field(default_factory=list)
    supporting_evidence: List[str] = Field(default_factory=list)
    policy_source_references: List[str] = Field(default_factory=list)
    disclaimer: str
    draft_status: str = "DRAFT"
    generated_at: str
