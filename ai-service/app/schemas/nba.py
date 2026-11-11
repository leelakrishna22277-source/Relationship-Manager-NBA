"""NBA generation output schemas — fixed shapes for every pipeline step."""
from pydantic import BaseModel, Field
from typing import List, Optional


class EvidenceRef(BaseModel):
    type: str = Field(..., description="HOLDING | SIGNAL")
    record_id: str = Field(..., description="Must reference a real holding/signal id")
    summary: str
    details: Optional[str] = None


class GeneratedNBA(BaseModel):
    client_id: Optional[str] = None
    action_type: str
    title: str
    reason: str
    priority: str = "MEDIUM"
    priority_proposal: Optional[str] = None
    suggested_product_id: Optional[str] = None
    suggested_product_name: Optional[str] = None
    evidence: List[EvidenceRef] = Field(default_factory=list)
    evidence_ids: List[str] = Field(default_factory=list)
    policy_source_references: List[str] = Field(default_factory=list)
    suitability_explanation: Optional[str] = None
    suggested_next_step: Optional[str] = None
    confidence: float = Field(0.5, ge=0.0, le=1.0)
    source: str = Field("LLM", description="LLM | RULE_ENGINE")


class SuitabilityRuleResult(BaseModel):
    id: str
    name: str
    status: str = Field(..., description="PASS | FAIL")
    details: str


class SuitabilityVerdict(BaseModel):
    is_suitable: bool
    rules: List[SuitabilityRuleResult] = Field(default_factory=list)


class NBAValidationResult(BaseModel):
    valid: bool
    rejected_reason: Optional[str] = None
    suitability: Optional[SuitabilityVerdict] = None


class NBAPipelineResult(BaseModel):
    run_id: str
    client_id: Optional[str] = None
    generated_nbas: List[dict] = Field(default_factory=list)
    suppressed_nbas: List[dict] = Field(default_factory=list)
    llm_provider: str
    llm_meta: dict = Field(default_factory=dict)
    pipeline_steps: List[dict] = Field(default_factory=list)
    generated_at: str
