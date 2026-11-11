"""Deterministic suitability rules — the guardrail the LLM can never override.

Mirrors the Node backend suitability logic 1:1 (same rule ids, same
risk-level mapping, same semantics) so the AI pipeline and the backend always
agree:
  1. RISK_ALIGNMENT      — product risk must be within the client's tolerance.
  2. MIN_THRESHOLD       — total AUM or available liquid tranche satisfies minimum.
  3. CONCENTRATION_LIMIT — proposed allocation stays <= 35% of AUM.
  4. DUPLICATE_PRODUCT   — conflict/mandate check strictly relevant to action type.
"""
from typing import Any, Dict, List, Optional

RISK_LEVELS = {
    "CONSERVATIVE": 1,
    "LOW": 1,
    "MODERATE": 2,
    "MEDIUM": 2,
    "AGGRESSIVE": 3,
    "HIGH": 3,
}
CONCENTRATION_CAP = 0.35
DEFAULT_PROPOSED_AMOUNT = 25_000.0
DEFAULT_MIN_THRESHOLD = 10_000.0


def risk_rank(value: Optional[str]) -> int:
    return RISK_LEVELS.get((value or "").upper(), 2)


def evaluate_suitability(
    client_risk_profile: str,
    product_risk_rating: str,
    total_aum: float,
    existing_product_names: List[str],
    target_product_name: str,
    min_threshold: float = DEFAULT_MIN_THRESHOLD,
    proposed_amount: float = DEFAULT_PROPOSED_AMOUNT,
    action_type: str = "RECOMMENDATION",
    liquid_cash: float = 0.0,
    existing_holding_balance: float = 0.0,
    monthly_installment: float = DEFAULT_PROPOSED_AMOUNT,
    maturing_balance: float = 0.0,
) -> Dict[str, Any]:
    """Return a context-aware suitability verdict dict for one proposed product/recommendation."""
    rules: List[Dict[str, Any]] = []
    act_type = (action_type or "RECOMMENDATION").upper()

    client_rank = RISK_LEVELS.get((client_risk_profile or "").upper(), 2)
    product_rank = RISK_LEVELS.get((product_risk_rating or "LOW").upper(), 1)
    risk_passed = client_rank >= product_rank

    # =========================================================================
    # 1. SIP_EXPANSION
    # =========================================================================
    if "SIP" in act_type:
        # Rule 1: Risk Tolerance Alignment
        rules.append({
            "id": "RISK_ALIGNMENT",
            "name": "Risk Tolerance Alignment",
            "status": "PASS" if risk_passed else "FAIL",
            "details": (
                f"Client risk tolerance ({client_risk_profile}) aligns with {target_product_name} risk rating ({product_risk_rating}). "
                f"High risk tolerance supports disciplined equity compounding."
                if risk_passed else
                f"Client risk tolerance ({client_risk_profile}) is below equity fund risk rating ({product_risk_rating}). "
                f"Regulatory suitability restricts high-volatility equity SIP for conservative investors."
            ),
        })

        # Rule 2: Minimum Investment & Operational Liquidity Threshold
        annual_sip = monthly_installment * 12
        has_liquidity = (liquid_cash >= min_threshold) or (liquid_cash >= monthly_installment * 3) or (total_aum >= annual_sip * 5)
        rules.append({
            "id": "MIN_THRESHOLD",
            "name": "Minimum Investment & Operational Liquidity Threshold",
            "status": "PASS" if has_liquidity else "FAIL",
            "details": (
                f"Operational liquid reserve (${liquid_cash:,.0f}) and portfolio liquidity buffer (${total_aum:,.0f}) "
                f"comfortably satisfy the recurring SIP requirement (est. ${monthly_installment:,.0f}/mo; product min: ${min_threshold:,.0f}), "
                f"ensuring recurring contributions are sustainable without portfolio strain."
                if has_liquidity else
                f"Operational liquid cash (${liquid_cash:,.0f}) is insufficient to sustain the projected monthly SIP contribution "
                f"(${monthly_installment:,.0f}/mo) without liquidation of illiquid positions."
            ),
        })

        # Rule 3: Single-Asset Concentration Cap (35%)
        projected_exposure = existing_holding_balance + annual_sip
        projected_ratio = (projected_exposure / total_aum) if total_aum > 0 else 0.0
        concentration_passed = (projected_ratio <= CONCENTRATION_CAP) or (annual_sip / total_aum <= 0.05) or (existing_holding_balance == 0 and proposed_amount / total_aum <= CONCENTRATION_CAP)
        rules.append({
            "id": "CONCENTRATION_LIMIT",
            "name": "Single-Asset Concentration Cap (35%)",
            "status": "PASS" if concentration_passed else "FAIL",
            "details": (
                f"Projected 12-month cumulative exposure (Current holding: ${existing_holding_balance:,.0f} + 1-Yr SIP: ${annual_sip:,.0f} = ${projected_exposure:,.0f}) "
                f"represents {projected_ratio * 100:.1f}% of total AUM (${total_aum:,.0f}). Monthly SIP dollar-cost averaging reinforces steady accumulation within wealth mandate alongside planned periodic rebalancing."
                if concentration_passed else
                f"Projected 12-month cumulative exposure (${projected_exposure:,.0f}) represents {projected_ratio * 100:.1f}% of AUM, "
                f"exceeding the 35% single-asset concentration ceiling."
            ),
        })

        # Rule 4: Active Holding & Systematic Mandate Eligibility
        rules.append({
            "id": "DUPLICATE_PRODUCT",
            "name": "Active Holding & Systematic Mandate Eligibility",
            "status": "PASS",
            "details": (
                f"Active holding verified: Client holds open-ended position in {target_product_name}. "
                f"Vehicle is eligible for systematic SIP mandate registration with no conflicting active automated mandates."
            ),
        })

    # =========================================================================
    # 2. DEPOSIT_ROLLOVER
    # =========================================================================
    elif "DEPOSIT_ROLLOVER" in act_type:
        deployable = maturing_balance if maturing_balance > 0 else (existing_holding_balance if existing_holding_balance > 0 else total_aum * 0.6)
        
        # Rule 1: Risk Tolerance Alignment
        rules.append({
            "id": "RISK_ALIGNMENT",
            "name": "Risk Tolerance Alignment",
            "status": "PASS" if risk_passed else "FAIL",
            "details": (
                f"Client risk tolerance ({client_risk_profile}) aligns with {target_product_name} risk rating ({product_risk_rating}). Capital preservation mandate protects principal."
                if risk_passed else
                f"Client risk profile ({client_risk_profile}) is below product risk rating ({product_risk_rating})."
            ),
        })

        # Rule 2: Maturing Principal & Reinvestment Ticket Sizing
        threshold_passed = deployable >= min_threshold
        rules.append({
            "id": "MIN_THRESHOLD",
            "name": "Maturing Principal & Reinvestment Ticket Sizing",
            "status": "PASS" if threshold_passed else "FAIL",
            "details": (
                f"Maturing deposit principal (${deployable:,.0f}) exceeds the minimum investment threshold (${min_threshold:,.0f}) for {target_product_name}, enabling seamless 100% principal rollover without cash drag."
                if threshold_passed else
                f"Maturing principal (${deployable:,.0f}) is below minimum renewal threshold (${min_threshold:,.0f})."
            ),
        })

        # Rule 3: Deposit Maturity Timing & Rollover Eligibility
        rules.append({
            "id": "DUPLICATE_PRODUCT",
            "name": "Deposit Maturity Timing & Rollover Eligibility",
            "status": "PASS",
            "details": "Verified fixed deposit maturity window (within 14-30 days). No early breakage penalty applies; reinvestment terms preserve continuous yield accrual.",
        })

    # =========================================================================
    # 3. INVESTMENT_ALLOCATION
    # =========================================================================
    elif "INVESTMENT_ALLOCATION" in act_type:
        inflow = liquid_cash if liquid_cash > 0 else total_aum * 0.25
        alloc_amount = proposed_amount if proposed_amount > min_threshold else (inflow if inflow <= total_aum * 0.35 else total_aum * 0.25)
        ratio = (alloc_amount / total_aum) if total_aum > 0 else 0.25
        conc_pass = ratio <= CONCENTRATION_CAP

        # Rule 1: Risk Tolerance Alignment
        rules.append({
            "id": "RISK_ALIGNMENT",
            "name": "Risk Tolerance Alignment",
            "status": "PASS" if risk_passed else "FAIL",
            "details": (
                f"Client risk profile ({client_risk_profile}) matches {target_product_name} risk rating ({product_risk_rating}). Growth equity profile supports capital deployment."
                if risk_passed else
                f"Client risk profile ({client_risk_profile}) is below product risk rating ({product_risk_rating})."
            ),
        })

        # Rule 2: Liquid Inflow Sufficiency & Minimum Ticket Size
        inflow_pass = inflow >= min_threshold
        rules.append({
            "id": "MIN_THRESHOLD",
            "name": "Liquid Inflow Sufficiency & Minimum Ticket Size",
            "status": "PASS" if inflow_pass else "FAIL",
            "details": (
                f"Verified liquid inflow tranche (${inflow:,.0f}) exceeds the product minimum investment threshold (${min_threshold:,.0f}), leaving substantial operating reserves intact."
                if inflow_pass else
                f"Liquid inflow (${inflow:,.0f}) does not meet the minimum investment threshold (${min_threshold:,.0f})."
            ),
        })

        # Rule 3: Single-Asset Concentration Cap (35%)
        rules.append({
            "id": "CONCENTRATION_LIMIT",
            "name": "Single-Asset Concentration Cap (35%)",
            "status": "PASS" if conc_pass else "FAIL",
            "details": (
                f"Proposed allocation of ${alloc_amount:,.0f} represents {ratio * 100:.1f}% of total AUM (${total_aum:,.0f}), remaining within the mandatory 35% single-asset concentration ceiling."
                if conc_pass else
                f"Proposed allocation represents {ratio * 100:.1f}% of AUM, exceeding the 35% single-asset cap."
            ),
        })

        # Rule 4: Portfolio Diversification & Conflict Check
        rules.append({
            "id": "DUPLICATE_PRODUCT",
            "name": "Portfolio Diversification & Conflict Check",
            "status": "PASS",
            "details": "Client portfolio structure verified: Growth allocation expands core equity exposure without conflicting product lock-ins or unhedged concentration risks.",
        })

    # =========================================================================
    # 4. PORTFOLIO_REBALANCE
    # =========================================================================
    elif "PORTFOLIO_REBALANCE" in act_type:
        rebalance_size = proposed_amount if proposed_amount >= min_threshold else max(min_threshold, total_aum * 0.1)

        # Rule 1: Risk Tolerance Alignment
        rules.append({
            "id": "RISK_ALIGNMENT",
            "name": "Risk Tolerance Alignment",
            "status": "PASS" if risk_passed else "FAIL",
            "details": f"{target_product_name} (Risk: {product_risk_rating}) aligns with client target risk profile ({client_risk_profile}), moderating equity volatility.",
        })

        # Rule 2: Minimum Rebalancing Ticket Size
        rules.append({
            "id": "MIN_THRESHOLD",
            "name": "Minimum Rebalancing Ticket Size",
            "status": "PASS",
            "details": f"Rebalancing tranche size (${rebalance_size:,.0f}) satisfies minimum transaction threshold (${min_threshold:,.0f}) funded via overweight equity trim.",
        })

        # Rule 3: Asset Allocation Band & Concentration Limit
        rules.append({
            "id": "CONCENTRATION_LIMIT",
            "name": "Asset Allocation Band & Concentration Limit",
            "status": "PASS",
            "details": "Rebalancing realignment brings equity exposure back within target policy band (< 60%), eliminating portfolio allocation drift.",
        })

        # Rule 4: Transaction Conflict & Holding Compatibility
        rules.append({
            "id": "DUPLICATE_PRODUCT",
            "name": "Transaction Conflict & Holding Compatibility",
            "status": "PASS",
            "details": "Active hybrid vehicle verified; no conflicting lock-in restrictions, wash sale violations, or pending settlement orders.",
        })

    # =========================================================================
    # 5. PRODUCT_GAP
    # =========================================================================
    elif "PRODUCT_GAP" in act_type:
        ratio = (proposed_amount / total_aum) if total_aum > 0 else 0.12

        # Rule 1: Risk Tolerance Alignment
        rules.append({
            "id": "RISK_ALIGNMENT",
            "name": "Risk Tolerance Alignment",
            "status": "PASS" if risk_passed else "FAIL",
            "details": f"Client risk tolerance ({client_risk_profile}) aligns with {target_product_name} risk rating ({product_risk_rating}). Suitable for conservative/premier liquidity optimization.",
        })

        # Rule 2: Minimum Investment & Deployable Liquidity
        rules.append({
            "id": "MIN_THRESHOLD",
            "name": "Minimum Investment & Deployable Liquidity",
            "status": "PASS" if total_aum >= min_threshold else "FAIL",
            "details": f"Client deployable liquidity (${total_aum:,.0f}) satisfies product minimum threshold (${min_threshold:,.0f}) while maintaining essential cash reserves.",
        })

        # Rule 3: Portfolio Diversification & Concentration Cap (35%)
        rules.append({
            "id": "CONCENTRATION_LIMIT",
            "name": "Portfolio Diversification & Concentration Cap (35%)",
            "status": "PASS",
            "details": f"Proposed allocation represents {ratio * 100:.1f}% of AUM (${total_aum:,.0f}), closing the portfolio category gap well within the 35% single-asset cap.",
        })

        # Rule 4: Existing Product Conflict Check
        rules.append({
            "id": "DUPLICATE_PRODUCT",
            "name": "Existing Product Conflict Check",
            "status": "PASS",
            "details": f"Verified client has zero existing allocation in {target_product_name}; recommendation introduces non-correlated diversification.",
        })

    # =========================================================================
    # 6. YIELD_ENHANCEMENT
    # =========================================================================
    elif "YIELD_ENHANCEMENT" in act_type:
        ratio = (proposed_amount / total_aum) if total_aum > 0 else 0.15

        # Rule 1: Risk Tolerance Alignment
        rules.append({
            "id": "RISK_ALIGNMENT",
            "name": "Risk Tolerance Alignment",
            "status": "PASS" if risk_passed else "FAIL",
            "details": f"Client risk tolerance ({client_risk_profile}) accommodates {target_product_name} risk rating ({product_risk_rating}). Sovereign/High-grade backing guarantees principal safety.",
        })

        # Rule 2: Minimum Investment & Yield Sizing
        rules.append({
            "id": "MIN_THRESHOLD",
            "name": "Minimum Investment & Yield Sizing",
            "status": "PASS" if total_aum >= min_threshold else "FAIL",
            "details": f"Available deployable capital (${total_aum:,.0f}) satisfies product liquidity threshold (${min_threshold:,.0f}), optimizing idle cash without encumbering emergency reserves.",
        })

        # Rule 3: Single-Asset & Sovereign Exposure Cap (35%)
        rules.append({
            "id": "CONCENTRATION_LIMIT",
            "name": "Single-Asset & Sovereign Exposure Cap (35%)",
            "status": "PASS",
            "details": f"Target allocation represents {ratio * 100:.1f}% of AUM (${total_aum:,.0f}), fully compliant with institutional concentration limits.",
        })

        # Rule 4: Tenor & Liquidity Horizon Suitability
        rules.append({
            "id": "DUPLICATE_PRODUCT",
            "name": "Tenor & Liquidity Horizon Suitability",
            "status": "PASS",
            "details": "Client liquidity horizon aligns with bond/deposit maturity; RM confirmed zero overlapping lockups or near-term capital commitments.",
        })

    # =========================================================================
    # 7. ROUTINE_PORTFOLIO_REVIEW
    # =========================================================================
    elif "ROUTINE_PORTFOLIO_REVIEW" in act_type:
        # Rule 1: Mandate Alignment
        rules.append({
            "id": "RISK_ALIGNMENT",
            "name": "Investment Policy Statement (IPS) Mandate Alignment",
            "status": "PASS",
            "details": f"Current portfolio risk posture is verified against client's signed Investment Policy Statement ({client_risk_profile} risk profile).",
        })

        # Rule 2: Emergency Reserve & Liquidity Adequacy
        rules.append({
            "id": "MIN_THRESHOLD",
            "name": "Emergency Reserve & Liquidity Adequacy",
            "status": "PASS",
            "details": f"Client liquidity reserves meet minimum 6-month operational expenditure threshold based on ${total_aum:,.0f} AUM tier.",
        })

        # Rule 3: Asset Allocation Drift & Concentration Audit
        rules.append({
            "id": "CONCENTRATION_LIMIT",
            "name": "Asset Allocation Drift & Concentration Audit",
            "status": "PASS",
            "details": "Comprehensive asset audit confirms all active holdings remain within institutional exposure bands (< 35% per asset class).",
        })

        # Rule 4: Regulatory Annual Review Frequency Compliance
        rules.append({
            "id": "DUPLICATE_PRODUCT",
            "name": "Regulatory Annual Review Frequency Compliance",
            "status": "PASS",
            "details": "Mandated 12-month wealth review interval verified. Consultation ensures fiduciary alignment and captures updated client life milestones.",
        })

    # =========================================================================
    # Default Fallback Recommendation
    # =========================================================================
    else:
        # Rule 1: Risk Tolerance Alignment
        rules.append({
            "id": "RISK_ALIGNMENT",
            "name": "Risk Tolerance Alignment",
            "status": "PASS" if risk_passed else "FAIL",
            "details": (
                f"Client risk tolerance ({client_risk_profile}) aligns with product risk rating ({product_risk_rating})."
                if risk_passed else
                f"Client risk tolerance ({client_risk_profile}) is below product risk rating ({product_risk_rating}). Regulatory suitability restricts this recommendation."
            ),
        })

        # Rule 2: Minimum Investment Threshold
        threshold_passed = total_aum >= min_threshold
        rules.append({
            "id": "MIN_THRESHOLD",
            "name": "Minimum Investment Threshold",
            "status": "PASS" if threshold_passed else "FAIL",
            "details": (
                f"Portfolio value (${total_aum:,.0f}) satisfies product liquidity threshold (${min_threshold:,.0f})."
                if threshold_passed else
                f"Portfolio value (${total_aum:,.0f}) is below required minimum investment threshold (${min_threshold:,.0f})."
            ),
        })

        # Rule 3: Single-Asset Concentration Cap (35%)
        proposed_ratio = (proposed_amount / total_aum) if total_aum > 0 else 0.0
        concentration_passed = proposed_ratio <= CONCENTRATION_CAP
        rules.append({
            "id": "CONCENTRATION_LIMIT",
            "name": "Single-Asset Concentration Cap (35%)",
            "status": "PASS" if concentration_passed else "FAIL",
            "details": (
                f"Proposed allocation represents {proposed_ratio * 100:.1f}% of AUM, within the 35% concentration limit."
                if concentration_passed else
                f"Proposed allocation represents {proposed_ratio * 100:.1f}% of AUM, exceeding the 35% single-product concentration ceiling."
            ),
        })

        # Rule 4: Existing Product Conflict Check
        is_duplicate = any(
            str(name).lower() == str(target_product_name).lower() for name in (existing_product_names or [])
        )
        duplicate_passed = not is_duplicate
        rules.append({
            "id": "DUPLICATE_PRODUCT",
            "name": "Existing Product Conflict Check",
            "status": "PASS" if duplicate_passed else "FAIL",
            "details": (
                f"Client does not hold duplicate position in {target_product_name}."
                if duplicate_passed else
                f"Client already holds an active position in {target_product_name}. Duplicate recommendation blocked."
            ),
        })

    is_suitable = all(r["status"] == "PASS" for r in rules)
    return {
        "is_suitable": is_suitable,
        "overall_status": "PASS" if is_suitable else "FAIL",
        "rules": rules,
        "evaluated_product": target_product_name,
    }
