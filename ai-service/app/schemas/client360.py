"""Pydantic schemas — the fixed data shape passed between every pipeline step."""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime


# ---------------------------------------------------------------------------
# Client 360 context (aggregated by the Node backend, forwarded to this service)
# ---------------------------------------------------------------------------

class HoldingRef(BaseModel):
    id: str
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    category: Optional[str] = None
    risk_rating: Optional[str] = None
    balance: float = 0.0
    maturity_date: Optional[datetime] = None


class SignalRef(BaseModel):
    id: str
    type: str
    data: Dict[str, Any] = Field(default_factory=dict)
    detected_at: Optional[datetime] = None


class ClientProfile(BaseModel):
    id: str
    full_name: str
    segment: str
    risk_profile: str


class ProductCatalogItem(BaseModel):
    id: str
    name: str
    category: str
    risk_rating: str
    min_investment: float = 0.0
    expected_return_bps: Optional[int] = None


class ActionHistoryItem(BaseModel):
    action_type: str
    status: str
    suggested_product_id: Optional[str] = None
    title: Optional[str] = None
    target_holding_id: Optional[str] = None


class Client360Context(BaseModel):
    client: ClientProfile
    holdings: List[HoldingRef] = Field(default_factory=list)
    signals: List[SignalRef] = Field(default_factory=list)
    product_catalog: List[ProductCatalogItem] = Field(default_factory=list)
    completed_actions: List[ActionHistoryItem] = Field(default_factory=list)
    generated_at: Optional[datetime] = None

    @property
    def total_aum(self) -> float:
        return float(sum(h.balance for h in self.holdings))

    def holding_ids(self) -> set:
        return {h.id for h in self.holdings}

    def signal_ids(self) -> set:
        return {s.id for s in self.signals}

    @property
    def completed_action_types(self) -> set:
        return {
            a.action_type
            for a in self.completed_actions
            if (a.status or "").upper() in ("COMPLETED", "ACCEPTED", "ACTIONED")
        }

    @property
    def completed_product_ids(self) -> set:
        return {
            a.suggested_product_id
            for a in self.completed_actions
            if a.suggested_product_id and (a.status or "").upper() in ("COMPLETED", "ACCEPTED", "ACTIONED")
        }

    @property
    def active_action_types(self) -> set:
        return {
            a.action_type
            for a in self.completed_actions
            if (a.status or "").upper() in ("PENDING", "ACTIVE")
        }

    @property
    def active_product_ids(self) -> set:
        return {
            a.suggested_product_id
            for a in self.completed_actions
            if a.suggested_product_id and (a.status or "").upper() in ("PENDING", "ACTIVE")
        }

    @property
    def all_handled_action_types(self) -> set:
        return self.completed_action_types | self.active_action_types
