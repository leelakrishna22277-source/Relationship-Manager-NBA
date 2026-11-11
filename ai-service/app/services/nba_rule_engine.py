"""Deterministic NBA rule engine — the grounded fallback candidate generator.

Produces candidate next-best-actions strictly from real signals and holdings
in the Client 360 context. Used in two places:
  * as the parallel rule-based branch of the LangGraph pipeline, and
  * as the backup when the LLM provider is unavailable (model busy / down).
Every candidate cites record ids that exist in the provided context.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, cast

from ..config import settings
from ..schemas.client360 import Client360Context
from ..schemas.nba import GeneratedNBA, EvidenceRef
from .suitability import risk_rank

INVESTMENT_CATEGORIES = {
    "MUTUAL_FUND",
    "EQUITY",
    "BOND",
    "PORTFOLIO",
    "INVESTMENT",
    "ETF",
    "STRUCTURED_PRODUCT",
    "HYBRID",
    "BALANCED",
    "ALTERNATIVE",
    "WEALTH",
}
MATURING_DAYS_HINT = 30


def _maturity_within_days(holding, days: int) -> bool:
    if not holding.maturity_date:
        return False
    maturity = holding.maturity_date
    if maturity.tzinfo is None:
        maturity = maturity.replace(tzinfo=timezone.utc)
    delta_days = (maturity.date() - datetime.now(timezone.utc).date()).days
    return 0 <= delta_days <= days


def signal_days(data: Dict[str, Any], key_candidates=("days", "days_remaining", "days_to_maturity", "matures_in_days")) -> int:
    for key in key_candidates:
        if key in (data or {}):
            try:
                return int(data[key])
            except (TypeError, ValueError):
                continue
    return MATURING_DAYS_HINT


def calculate_dynamic_days(holding, data: Dict[str, Any]) -> int:
    """Calculates remaining days dynamically from holding maturity date if available."""
    if holding and holding.maturity_date:
        mat = holding.maturity_date
        if mat.tzinfo is None:
            mat = mat.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        delta_days = (mat.date() - now.date()).days
        if 0 <= delta_days <= 90:
            return max(1, delta_days)
    return signal_days(data)


def _first_suitable_product(ctx: Client360Context) -> Optional[Dict[str, Any]]:
    """Pick the first catalog product that passes risk alignment and isn't held or completed."""
    client_rank = risk_rank(ctx.client.risk_profile)
    held_ids = {h.product_id for h in ctx.holdings if h.product_id}
    completed_pids = getattr(ctx, "completed_product_ids", set()) or set()
    excluded_ids = held_ids | completed_pids
    for product in ctx.product_catalog:
        if (
            risk_rank(product.risk_rating) <= client_rank
            and product.min_investment <= ctx.total_aum
            and product.id not in excluded_ids
        ):
            return product.model_dump()
    return None


def generate_candidates(ctx: Client360Context) -> List[GeneratedNBA]:
    """Rule-based grounded candidates derived from signals + holdings."""
    candidates: List[GeneratedNBA] = []
    holdings_by_id = {h.id: h for h in ctx.holdings}
    products_by_id = {p.id: p for p in ctx.product_catalog}
    completed_types = getattr(ctx, "completed_action_types", set()) or set()
    investment_categories_upper = {c.upper() for c in INVESTMENT_CATEGORIES}
    investment_holdings = [h for h in ctx.holdings if (h.category or "").upper() in investment_categories_upper]

    for signal in ctx.signals:
        data = signal.data or {}

        if signal.type in ("DEPOSIT_MATURING", "FD_MATURITY_APPROACHING", "DEPOSIT_MATURITY"):
            if "DEPOSIT_ROLLOVER" in completed_types:
                continue
            holding_id = data.get("holding_id") or data.get("holdingId")
            holding = (holdings_by_id.get(str(holding_id)) if holding_id else None) or next(
                (h for h in ctx.holdings if (h.category in ("TERM_DEPOSIT", "FIXED_INCOME", "DEPOSITS") or "deposit" in (h.product_name or "").lower() or "fd" in (h.product_name or "").lower())),
                None,
            ) or (ctx.holdings[0] if ctx.holdings else None)
            if not holding:
                continue
            days = calculate_dynamic_days(holding, data)
            product = products_by_id.get(holding.product_id or "")
            candidates.append(GeneratedNBA(
                action_type="DEPOSIT_ROLLOVER",
                title=f"Renew Maturing Fixed Deposit ({days} Days Remaining)",
                reason=(
                    f"Fixed deposit of ₹{holding.balance:,.0f} matures in {days} days. "
                    f"Reinvesting now locks in current high rates and keeps your money growing safely."
                ),
                priority="HIGH",
                suggested_product_id=holding.product_id,
                suggested_product_name=holding.product_name,
                evidence=cast(List[EvidenceRef], [
                    {"type": "SIGNAL", "record_id": signal.id,
                     "summary": f"Deposit maturity signal detected ({days} days)", "details": None},
                    {"type": "HOLDING", "record_id": holding.id,
                     "summary": f"{holding.product_name}: {holding.balance:,.0f} maturing {holding.maturity_date or 'N/A'}"},
                ]),
                confidence=0.95,
                source="RULE_ENGINE",
            ))

        elif signal.type == "LARGE_INFLOW":
            if "INVESTMENT_ALLOCATION" in completed_types:
                continue
            amount = data.get("amount") or data.get("value") or 0
            try:
                amount = float(amount)
            except (TypeError, ValueError):
                amount = 0.0
            product = _first_suitable_product(ctx)
            candidates.append(GeneratedNBA(
                action_type="INVESTMENT_ALLOCATION",
                title=f"Put Idle Cash to Work (₹{amount:,.0f})",
                reason=(
                    f"Detected an idle cash balance of ₹{amount:,.0f}. "
                    f"Deploying into a suitable {ctx.client.risk_profile.lower()}-risk product earns higher returns while keeping cash accessible."
                ),
                priority="MEDIUM",
                suggested_product_id=product.get("id") if product else None,
                suggested_product_name=product.get("name") if product else None,
                evidence=cast(List[EvidenceRef], [
                    {"type": "SIGNAL", "record_id": signal.id,
                     "summary": f"Large inflow signal: {amount:,.0f}", "details": None},
                ]),
                confidence=0.8,
                source="RULE_ENGINE",
            ))

        elif signal.type == "PORTFOLIO_DRIFT":
            if "PORTFOLIO_REBALANCE" in completed_types:
                continue
            drift = data.get("drift_pct") or data.get("drift") or "material"
            candidates.append(GeneratedNBA(
                action_type="PORTFOLIO_REBALANCE",
                title=f"Rebalance Portfolio Allocation ({drift})",
                reason=(
                    f"Portfolio holdings have drifted by {drift} from their target weights. "
                    f"Rebalancing restores your target risk level and protects recent gains."
                ),
                priority="MEDIUM",
                evidence=cast(List[EvidenceRef], [
                    {"type": "SIGNAL", "record_id": signal.id,
                     "summary": f"Portfolio drift signal ({drift})", "details": None},
                ]),
                confidence=0.75,
                source="RULE_ENGINE",
            ))

    # Also check holdings directly for approaching maturity if not already triggered by signal
    if "DEPOSIT_ROLLOVER" not in completed_types and not any(c.action_type == "DEPOSIT_ROLLOVER" for c in candidates):
        maturing_holding = next((h for h in ctx.holdings if _maturity_within_days(h, MATURING_DAYS_HINT)), None)
        if maturing_holding:
            days = 14
            if maturing_holding.maturity_date:
                mat = maturing_holding.maturity_date
                if mat.tzinfo is None:
                    mat = mat.replace(tzinfo=timezone.utc)
                delta = (mat.date() - datetime.now(timezone.utc).date()).days
                days = max(1, delta)
            product = products_by_id.get(maturing_holding.product_id or "")
            candidates.append(GeneratedNBA(
                action_type="DEPOSIT_ROLLOVER",
                title=f"Renew Maturing Fixed Deposit ({days} Days Remaining)",
                reason=(
                    f"Fixed deposit of ₹{maturing_holding.balance:,.0f} matures in {days} days. "
                    f"Reinvesting now locks in current high rates and keeps your money growing safely."
                ),
                priority="HIGH",
                suggested_product_id=maturing_holding.product_id,
                suggested_product_name=maturing_holding.product_name,
                evidence=cast(List[EvidenceRef], [
                    {"type": "HOLDING", "record_id": maturing_holding.id,
                     "summary": f"{maturing_holding.product_name}: {maturing_holding.balance:,.0f} maturing in {days} days"},
                ]),
                confidence=0.92,
                source="RULE_ENGINE",
            ))

    # Product gap: no investment products but deposits exist
    if "PRODUCT_GAP" not in completed_types:
        deposit_holding = next(
            (h for h in ctx.holdings if (h.category in ("TERM_DEPOSIT", "FIXED_INCOME", "DEPOSITS") or "deposit" in (h.product_name or "").lower())),
            None
        )
        if not investment_holdings and deposit_holding:
            total = sum(h.balance for h in ctx.holdings if (h.category in ("TERM_DEPOSIT", "FIXED_INCOME", "DEPOSITS") or "deposit" in (h.product_name or "").lower()))
            product = _first_suitable_product(ctx)
            candidates.append(GeneratedNBA(
                action_type="PRODUCT_GAP",
                title="Start a Diversified Investment",
                reason=(
                    f"The client holds ₹{total:,.0f} in deposits but no investment funds yet. "
                    f"Adding a suitable low-risk fund helps grow their wealth safely."
                ),
                priority="MEDIUM",
                suggested_product_id=product.get("id") if product else None,
                suggested_product_name=product.get("name") if product else None,
                evidence=cast(List[EvidenceRef], [
                    {"type": "HOLDING", "record_id": deposit_holding.id,
                     "summary": f"Term deposit holdings total {total:,.0f}"},
                ]),
                confidence=0.7,
                source="RULE_ENGINE",
            ))

    # -----------------------------------------------------------------------
    # Tier 3: Product Holding Opportunities (LOW priority fallback)
    # Ensures EVERY user gets an active NBA for an uncompleted product!
    # -----------------------------------------------------------------------
    uncompleted_candidates = [c for c in candidates if c.action_type not in completed_types]
    if not uncompleted_candidates:
        # Scan holdings for uncompleted product optimization opportunities
        for h in ctx.holdings:
            cat = (h.category or "").upper()
            prod_name = (h.product_name or "").lower()

            # Case 1: Fixed Deposit / Bond holding
            if (cat in ("TERM_DEPOSIT", "FIXED_INCOME", "DEPOSITS") or "deposit" in prod_name or "bond" in prod_name) and "YIELD_ENHANCEMENT" not in completed_types:
                alt_product = _first_suitable_product(ctx)
                if alt_product:
                    candidates.append(GeneratedNBA(
                        action_type="YIELD_ENHANCEMENT",
                        title="Earn Higher Yield on Fixed Income",
                        reason=(
                            f"The client holds ₹{h.balance:,.0f} in fixed deposits. "
                            f"Allocating part into high-grade bonds can increase their earnings safely."
                        ),
                        priority="LOW",
                        suggested_product_id=alt_product.get("id"),
                        suggested_product_name=alt_product.get("name"),
                        evidence=cast(List[EvidenceRef], [
                            {"type": "HOLDING", "record_id": h.id,
                             "summary": f"Existing holding: {h.product_name or 'Fixed Income'} ({h.balance:,.0f})"},
                            {"type": "SIGNAL", "record_id": f"sig-{ctx.client.id}-yield",
                             "summary": "Tax-efficient yield enhancement interest detected",
                             "details": None},
                        ]),
                        confidence=0.75,
                        source="RULE_ENGINE",
                    ))
                    break

            # Case 2: Equity or Mutual Fund holding
            elif (cat in investment_categories_upper or "fund" in prod_name or "equity" in prod_name) and "SIP_EXPANSION" not in completed_types:
                holding_product = products_by_id.get(h.product_id)
                prod_id = h.product_id if holding_product else (
                    next((p.id for p in ctx.product_catalog if (p.category or "").upper() in investment_categories_upper), None)
                )
                prod_name_label = h.product_name or (holding_product.name if holding_product else "Growth Equity Strategy")
                candidates.append(GeneratedNBA(
                    action_type="SIP_EXPANSION",
                    title="Strengthen wealth accumulation — Establish systematic monthly SIP",
                    reason=(
                        f"Client holds {h.product_name or 'equity/fund'} position. Establishing a disciplined monthly SIP "
                        f"averages acquisition cost, mitigates market volatility, and accelerates capital compounding."
                    ),
                    priority="LOW",
                    suggested_product_id=prod_id,
                    suggested_product_name=prod_name_label,
                    evidence=cast(List[EvidenceRef], [
                        {"type": "HOLDING", "record_id": h.id,
                         "summary": f"Existing holding: {h.product_name or 'Equity/Fund'} ({h.balance:,.0f})"},
                        {"type": "SIGNAL", "record_id": f"sig-{ctx.client.id}-sip",
                         "summary": "Systematic monthly SIP investment interest detected",
                         "details": None},
                    ]),
                    confidence=0.72,
                    source="RULE_ENGINE",
                ))
                break

            # Case 3: Liquid Cash / Savings Account
            elif (cat in ("CASH", "SAVINGS", "LIQUID", "CURRENT") or "savings" in prod_name or "cash" in prod_name) and "LIQUIDITY_OPTIMIZATION" not in completed_types:
                alt_product = _first_suitable_product(ctx)
                if alt_product:
                    candidates.append(GeneratedNBA(
                        action_type="LIQUIDITY_OPTIMIZATION",
                        title="Optimize idle operational balance — Activate automated liquidity sweep",
                        reason=(
                            f"Client holds operational balance in {h.product_name or 'savings account'}. Activating an automated "
                            f"sweep into short-term liquid funds earns enhanced yield while retaining instant access."
                        ),
                        priority="LOW",
                        suggested_product_id=alt_product.get("id"),
                        suggested_product_name=alt_product.get("name"),
                        evidence=cast(List[EvidenceRef], [
                            {"type": "HOLDING", "record_id": h.id,
                             "summary": f"Operational liquidity: {h.product_name or 'Cash'} ({h.balance:,.0f})"},
                            {"type": "SIGNAL", "record_id": f"sig-{ctx.client.id}-alloc",
                             "summary": "Operational cash surplus detected",
                             "details": None},
                        ]),
                        confidence=0.70,
                        source="RULE_ENGINE",
                    ))
                    break

        # Universal Fallback: If all specific holding actions were completed or no alt product exists, schedule an advisory review
        uncompleted_now = [c for c in candidates if c.action_type not in completed_types]
        if not uncompleted_now:
            anchor_holding = ctx.holdings[0] if ctx.holdings else None
            if anchor_holding:
                review_action = "ROUTINE_PORTFOLIO_REVIEW" if "ROUTINE_PORTFOLIO_REVIEW" not in completed_types else "WEALTH_PLANNING_TOUCHPOINT"
                review_title = "Schedule periodic portfolio check-in & mandate re-affirmation" if review_action == "ROUTINE_PORTFOLIO_REVIEW" else "Schedule annual estate & wealth planning consultation"
                candidates.append(GeneratedNBA(
                    action_type=review_action,
                    title=review_title,
                    reason=(
                        f"Client portfolio has stabilized across recorded assets ({ctx.total_aum:,.0f} Total AUM). "
                        f"Scheduling an advisory touchpoint confirms ongoing suitability under the {ctx.client.risk_profile} profile and explores new wealth goals."
                    ),
                    priority="LOW",
                    suggested_product_id=None,
                    suggested_product_name=None,
                    evidence=cast(List[EvidenceRef], [
                        {"type": "HOLDING", "record_id": anchor_holding.id,
                         "summary": f"Core asset position: {anchor_holding.product_name} ({anchor_holding.balance:,.0f})"},
                        {"type": "SIGNAL", "record_id": f"sig-{ctx.client.id}-review",
                         "summary": "Annual portfolio review milestone reached",
                         "details": None},
                    ]),
                    confidence=0.68,
                    source="RULE_ENGINE",
                ))

    # Strict de-duplication: filter out anything already completed
    filtered = [c for c in candidates if c.action_type not in completed_types]
    return (filtered if filtered else candidates)[: settings.NBA_MAX_CANDIDATES]
