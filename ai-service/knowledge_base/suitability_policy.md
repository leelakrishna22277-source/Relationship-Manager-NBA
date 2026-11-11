# Institutional Banking Policy: Product Suitability & Investor Protection Framework
**Document ID:** POL-SUIT-2026-V1  
**Category:** Regulatory Compliance & Risk Governance  
**Version:** 1.0.0  
**Effective Date:** 2026-01-01  
**Jurisdiction:** Reserve Bank / SEBI Wealth Governance Guidelines (Synthetic Sandbox)  
**Target Audience:** Relationship Managers (RMs), Investment Advisors, AI Recommendation Engines  

> **NOTICE:** This is a realistic sample policy formulated specifically for the synthetic Indian banking and wealth advisory environment (BNK-10). It is not an actual bank-approved legal or regulatory document.

---

## 1. Executive Summary & Purpose
This framework defines deterministic rules governing Next-Best-Action (NBA) suggestions and investment product allocations for wealth and retail clients in India. The primary mandate is preventing product mis-selling, enforcing risk alignment, and ensuring fiduciary duty under institutional banking guidelines.

---

## 2. Client Risk Profile Classifications

Every client in the core banking database is assigned a validated risk profile derived from an annual Suitability Questionnaire:

### 2.1 CONSERVATIVE (Risk Tier 1)
- **Objective:** Capital preservation and liquid savings. Zero or negligible tolerance for principal drawdown.
- **Maximum Permissible Product Risk:** `LOW`
- **Permitted Asset Classes:** Cash deposits, Treasury Bills, Government Fixed Deposits, Guaranteed Term Deposits.
- **Prohibited Asset Classes:** Equities, High-Yield Corporate Bonds, Derivative Structured Notes, Cryptocurrencies.

### 2.2 MODERATE (Risk Tier 2)
- **Objective:** Balanced long-term capital growth with steady income generation. Willingness to accept mild, short-term mark-to-market fluctuations.
- **Maximum Permissible Product Risk:** `MEDIUM`
- **Permitted Asset Classes:** Investment-Grade Corporate Debt, Balanced Mutual Funds, Multi-Asset Allocation Funds, Sovereign Fixed Income, Term Deposits.
- **Prohibited Asset Classes:** Unhedged Structured Derivatives, Leveraged Credit, High-Yield Speculative Notes.

### 2.3 AGGRESSIVE (Risk Tier 3)
- **Objective:** Maximum capital appreciation over a multi-year horizon (5+ years). Full tolerance for market volatility and potential temporary principal drawdowns.
- **Maximum Permissible Product Risk:** `HIGH`
- **Permitted Asset Classes:** Concentrated Equity Portfolios, Growth Mutual Funds, Structured Notes, Private Equity Feeders, Foreign Exchange Structured Notes.

---

## 3. Product Suitability Matrix (Deterministic Enforcement)

The suitability engine compares the client risk tolerance score with the proposed product risk score:

| Client Risk Profile | Product Risk Rating: LOW | Product Risk Rating: MEDIUM | Product Risk Rating: HIGH |
|---------------------|--------------------------|-----------------------------|---------------------------|
| **CONSERVATIVE**    | ✅ **PASS** (Eligible)    | ❌ **REJECT** (Restricted)  | ❌ **REJECT** (Restricted)|
| **MODERATE**        | ✅ **PASS** (Eligible)    | ✅ **PASS** (Eligible)      | ❌ **REJECT** (Restricted)|
| **AGGRESSIVE**      | ✅ **PASS** (Eligible)    | ✅ **PASS** (Eligible)      | ✅ **PASS** (Eligible)    |

> **Mandatory Rule:** An AI model or human Relationship Manager **cannot** downgrade a product's risk or override a `REJECT` decision. Any recommendation breaching this matrix is automatically suppressed.

---

## 4. Concentration and Exposure Caps

To ensure proper asset diversification across the client portfolio:
1. **Single-Asset Cap:** No single non-guaranteed investment product allocation may exceed **35% of Total Assets Under Management (AUM)**.
2. **Liquidity Buffer:** Recommendations must never deplete client cash/liquid savings below **20% of Total AUM** or a minimum buffer of **₹1,00,000**, whichever is greater.
3. **Duplicate Position Guard:** A recommendation for a product the client already holds is blocked unless the existing position matures within 30 calendar days.

---

## 5. Evidence Grounding & Verification
Every recommendation must be directly grounded in verified customer data stored in the core transactional database:
- **Deposit Maturity:** Triggered only if an active holding matures within ≤ 30 days.
- **Cash Drag / Large Inflow:** Triggered only if uninvested liquidity exceeds 35% of total portfolio value.
- **Product Gap:** Triggered only if the client lacks a core portfolio building block appropriate for their validated segment and risk profile.

Recommendations lacking valid evidence IDs will fail validation and will not be displayed to the Relationship Manager.
