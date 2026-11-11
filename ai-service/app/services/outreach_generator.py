from datetime import datetime, timezone
from typing import List
from ..schemas.outreach import OutreachDraftRequest, OutreachDraftResponse

REGULATORY_DISCLAIMER = (
    "CONFIDENTIAL RELATIONSHIP MANAGER DRAFT ONLY: Prepared for internal decision-support and communication "
    "planning. This draft is NOT dispatched automatically and must not be transmitted without explicit RM review, "
    "customization, and institutional policy compliance."
)

class OutreachGenerator:
    @staticmethod
    def _extract_citations(req: OutreachDraftRequest) -> List[str]:
        citations = [
            f"Client Profile: {req.client_name} ({req.segment} segment, {req.risk_profile} risk tolerance)",
            f"Recommendation Trigger: {req.title}",
        ]
        if req.product_name:
            citations.append(f"Proposed Asset / Solution: {req.product_name}")
        if req.expected_return_bps:
            yield_pct = req.expected_return_bps / 100.0
            citations.append(f"Expected Rate / Yield: {yield_pct:.2f}% per annum")

        if req.evidence:
            for item in req.evidence:
                if isinstance(item, dict):
                    text = item.get("text") or item.get("details") or item.get("rule")
                    if text:
                        citations.append(f"Grounding Signal: {text}")
                elif isinstance(item, str):
                    citations.append(f"Grounding Signal: {item}")

        return citations

    @classmethod
    def generate(cls, req: OutreachDraftRequest) -> OutreachDraftResponse:
        tone = (req.tone or "ADVISORY").upper()
        channel = (req.channel or "EMAIL").upper()
        citations = cls._extract_citations(req)
        client_name = req.client_name or "Valued Client"
        first_name = client_name.split()[0] if client_name else "Valued Client"
        product_label = req.product_name or "recommended portfolio solution"
        rate_mention = f" offering an indicative yield of {req.expected_return_bps / 100.0:.2f}%" if req.expected_return_bps else ""
        rm_name = req.rm_name or "Priya Verma"
        bank_name = req.bank_name or "Apex Private Bank"

        # Format by Channel & Tone
        if channel == "CALL_SCRIPT":
            subject = f"{req.title} – Client Outreach Script"
            
            # Formulate tailored discussion block
            is_rollover = "ROLLOVER" in (req.action_type or "").upper() or "MATURING" in (req.title or "").upper() or "DEPOSIT" in (req.title or "").upper()
            is_sip = "SIP" in (req.action_type or "").upper() or "SIP" in (req.title or "").upper()
            
            rate_str = f"at an indicative interest rate of {req.expected_return_bps / 100.0:.2f}% p.a." if req.expected_return_bps else "at attractive institutional terms"
            
            if is_rollover:
                discussion_text = (
                    f"Our records indicate an upcoming fixed deposit maturity under your account portfolio.\n\n"
                    f"I wanted to understand your plans for these funds. You could consider reinvesting the entire amount, reinvesting a portion, or keeping the proceeds available for your upcoming liquidity needs.\n\n"
                    f"The {product_label} is currently available {rate_str} and carries a {req.risk_profile.upper()} risk classification. Please note that this rate is indicative and not guaranteed. The final applicable rate and maturity terms will be confirmed at the time of booking.\n\n"
                    f"Would you be considering reinvestment, or do you anticipate needing these funds in the near term?"
                )
            elif is_sip:
                discussion_text = (
                    f"In reviewing your portfolio cash flows, we identified an opportunity to systematically compound your wealth without market timing risks.\n\n"
                    f"We recommend establishing a monthly Systematic Investment Plan (SIP) into {product_label} {rate_str}. This approach enforces disciplined cost averaging and aligns with your {req.risk_profile.upper()} risk tolerance.\n\n"
                    f"Would you be open to exploring this disciplined allocation for your monthly surplus?"
                )
            else:
                discussion_text = (
                    f"As part of our proactive wealth review for {req.segment} clients, we identified a capital optimization opportunity: {req.title}.\n\n"
                    f"{req.reason or 'Our analytics flagged an asset allocation adjustment to optimize risk-adjusted yield.'}\n\n"
                    f"Deploying into {product_label} {rate_str} provides stable capital preservation aligned with your {req.risk_profile.upper()} risk profile.\n\n"
                    f"Would you be interested in reviewing how this allocation enhances your current portfolio structure?"
                )

            body = (
                f"# {req.title} – Client Outreach Script\n\n"
                f"**Client:** {client_name} | **Segment:** {req.segment or 'PREMIER'}\n\n"
                f"**Opening**\n\n"
                f"Good morning, may I speak with {client_name}?\n\n"
                f"Hi {first_name}, this is {rm_name} calling from {bank_name}. I hope you're doing well. "
                f"I'm reaching out regarding {req.title.lower()} and wanted to connect with you in advance to discuss your available options. Do you have a couple of minutes?\n\n"
                f"**Identity Verification**\n\n"
                f"Before discussing your account details, could you please confirm your date of birth and registered mobile number for verification purposes?\n\n"
                f"*(Proceed only after successful verification.)*\n\n"
                f"**Discussion**\n\n"
                f"{discussion_text}\n\n"
                f"**Closing**\n\n"
                f"My suggestion would be to arrange a short consultation so we can review the available options and applicable terms together. There's no obligation to decide during this call.\n\n"
                f"Would you prefer a follow-up call or should I send you a written summary first?\n\n"
                f"Thank you for your time, {first_name}. I'll follow up as discussed. Have a wonderful day!\n\n"
                f"**RM Reminder:** Complete identity verification, confirm the applicable rate and maturity terms, obtain client authorization before proceeding, and document the client's decision."
            )

        elif channel == "MEETING_BRIEF":
            subject = f"RM Meeting Brief: {client_name} - {req.title}"
            body = (
                f"CLIENT SITUATION & MEETING OBJECTIVE:\n"
                f"• Client: {client_name} | Segment: {req.segment} | Risk Tolerance: {req.risk_profile}\n"
                f"• Focus: {req.title}\n"
                f"• Background: {req.reason or 'Maturing liquidity position requiring proactive allocation review.'}\n\n"
                f"RECOMMENDED STRUCTURE:\n"
                f"• Proposed Asset: {product_label}{rate_mention}\n"
                f"• Suitability Alignment: Confirmed suitable for {req.risk_profile} risk appetite and within 35% concentration caps.\n\n"
                f"TALKING POINTS & VALUE PROPOSITION:\n"
                f"• Reinforce capital stability and timely re-deployment to eliminate cash drag.\n"
                f"• Present term structure and liquidity access terms.\n\n"
                f"ACTION ITEMS:\n"
                f"• Obtain verbal assent for allocation proposal.\n"
                f"• Log client response and follow-up requirements in NBA Console."
            )

        else: # EMAIL
            if tone == "EXECUTIVE":
                subject = f"Portfolio Allocation Update: {req.title}"
                body = (
                    f"Dear {first_name},\n\n"
                    f"I am writing to share a concise update regarding your portfolio positioning:\n\n"
                    f"• Opportunity: {req.title}\n"
                    f"• Strategic Solution: {product_label}{rate_mention}\n"
                    f"• Context: {req.reason or 'Proactive optimization identified during our scheduled account review.'}\n\n"
                    f"Given current rate structures, locking this allocation ensures sustained return while strictly honoring your {req.risk_profile.lower()} investment mandates.\n\n"
                    f"Please let me know if you would like me to prepare the subscription confirmation for your digital sign-off.\n\n"
                    f"Best regards,\n{rm_name}\nRelationship Manager\n{bank_name}"
                )
            elif tone == "PROFESSIONAL":
                subject = f"Review & Recommendation: {req.title}"
                body = (
                    f"Dear {first_name},\n\n"
                    f"I hope this note finds you well.\n\n"
                    f"In review of your wealth holdings, our relationship management team has identified a timely next step: {req.title}.\n\n"
                    f"{req.reason or 'Our analytics flagged an upcoming maturity that presents an attractive reinvestment window.'}\n\n"
                    f"We recommend deploying into {product_label}{rate_mention}. This recommendation has been verified against our institutional suitability standards and aligns with your {req.risk_profile.lower()} profile.\n\n"
                    f"I would be delighted to coordinate a brief conversation this week to review terms and finalize arrangements.\n\n"
                    f"Sincerely,\n{rm_name}\nRelationship Manager\n{bank_name}"
                )
            else: # ADVISORY
                is_sip = "SIP" in (req.action_type or "").upper() or "SIP" in (req.title or "").upper()
                subject = f"Strategic Wealth Advisory: {req.title}"
                action_phrase = (
                    f"setting up a disciplined monthly SIP into {product_label}"
                    if is_sip else
                    f"allocating toward {product_label}{rate_mention}"
                )
                body = (
                    f"Dear {first_name},\n\n"
                    f"I hope you are having a wonderful week.\n\n"
                    f"As part of our continuous stewardship of your {req.segment} wealth portfolio, I am reaching out to share a tailored recommendation: {req.title}.\n\n"
                    f"{req.reason or 'We recently observed significant portfolio liquidity that could benefit from proactive rate locking.'}\n\n"
                    f"To ensure your assets remain efficiently deployed without exposing you to unnecessary volatility, we suggest {action_phrase}. Our deterministic suitability analysis confirms this holding harmonizes with your {req.risk_profile.lower()} risk profile and maintains balanced diversification.\n\n"
                    f"Would you be open to a brief discussion on Thursday or Friday to walk through the details?\n\n"
                    f"Warm regards,\n{rm_name}\nRelationship Manager\n{bank_name}"
                )

        if req.custom_instructions:
            body += f"\n\n[RM Note: {req.custom_instructions}]"

        return OutreachDraftResponse(
            subject=subject,
            body=body,
            channel=channel,
            tone=tone,
            grounding_citations=citations,
            disclaimer=REGULATORY_DISCLAIMER,
            generated_at=datetime.now(timezone.utc).isoformat(),
        )
