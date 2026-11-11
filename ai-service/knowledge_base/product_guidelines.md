# Institutional Banking Product Catalog & Eligibility Guidelines
**Document ID:** GDL-PROD-2026-V1  
**Category:** Product Management & Asset Specifications  
**Version:** 1.0.0  
**Effective Date:** 2026-01-01  
**Jurisdiction:** Reserve Bank of India Regulatory Framework (Synthetic Sandbox)  
**Target Audience:** Relationship Managers (RMs), Wealth Specialists, AI Recommendation Engine  

> **NOTICE:** This is a realistic sample policy formulated specifically for the synthetic Indian banking and wealth advisory environment (BNK-10). It is not an actual bank-approved legal or regulatory document.

---

## 1. Product Catalog Overview
This guideline specifies institutional parameters, indicative returns, risk classifications, eligibility criteria, and regulatory conditions governing product recommendations for Indian wealth and retail banking clients.

---

## 2. Product Specifications & Eligibility Rules

### 2.1 18-Month High-Yield Fixed Deposit
- **Product ID:** `prod-fd-18m`
- **Category:** `FIXED_INCOME`
- **Risk Rating:** `LOW`
- **Minimum Investment:** ₹1,00,000.00
- **Indicative Return:** 7.40% p.a. (740 bps)
- **Tenor:** 18 Months
- **Capital Protection:** 100% Principal Protected (DICGC insured up to statutory limit).
- **Eligible Segments:** `RETAIL`, `PREMIER`, `HNI`
- **Eligible Risk Profiles:** `CONSERVATIVE`, `MODERATE`, `AGGRESSIVE`
- **Policy Rules:**
  - Mandatory choice for conservative clients facing deposit maturity.
  - Recommended vehicle for rollover of maturing deposits to avoid uncompensated cash drag.

### 2.2 Sovereign Green Infrastructure Bond
- **Product ID:** `prod-green-bond`
- **Category:** `FIXED_INCOME`
- **Risk Rating:** `LOW`
- **Minimum Investment:** ₹2,50,000.00
- **Indicative Return:** 7.85% p.a. (785 bps)
- **Tenor:** 36 Months / Semi-annual coupon
- **Capital Protection:** Sovereign credit guarantee.
- **Eligible Segments:** `PREMIER`, `HNI`
- **Eligible Risk Profiles:** `CONSERVATIVE`, `MODERATE`, `AGGRESSIVE`
- **Policy Rules:**
  - Suitable for capital preservation with green asset mandate.
  - Zero credit risk; eligible for long-term tax-efficient holding.

### 2.3 Dynamic Balanced Advantage Fund
- **Product ID:** `prod-balanced-adv`
- **Category:** `HYBRID`
- **Risk Rating:** `MEDIUM`
- **Minimum Investment:** ₹5,00,000.00
- **Indicative Return:** 10.50% p.a. (1050 bps, variable)
- **Asset Allocation:** Dynamic 30%–70% equity / debt rebalancing.
- **Capital Protection:** None (subject to market risk).
- **Eligible Segments:** `PREMIER`, `HNI`
- **Eligible Risk Profiles:** `MODERATE`, `AGGRESSIVE` (**PROHIBITED** for `CONSERVATIVE`).
- **Policy Rules:**
  - Recommended when portfolio equity allocation drifts above target band.
  - Enforces automatic hedging during market downturns.

### 2.4 Bluechip Alpha Equity Opportunities
- **Product ID:** `prod-equity-opp`
- **Category:** `EQUITY`
- **Risk Rating:** `HIGH`
- **Minimum Investment:** ₹5,00,000.00
- **Indicative Return:** 14.20% p.a. (1420 bps, market linked)
- **Asset Allocation:** Concentrated large-cap high-growth equities.
- **Capital Protection:** None (high volatility).
- **Eligible Segments:** `PREMIER`, `HNI`
- **Eligible Risk Profiles:** Strictly `AGGRESSIVE` (**PROHIBITED** for `CONSERVATIVE` and `MODERATE`).
- **Policy Rules:**
  - Strictly forbidden for capital preservation portfolios.
  - Max allocation capped at 35% of total client AUM.

### 2.5 Corporate Liquid Treasury Sweep
- **Product ID:** `prod-treasury-sweep`
- **Category:** `TREASURY`
- **Risk Rating:** `LOW`
- **Minimum Investment:** ₹10,00,000.00
- **Indicative Return:** 6.80% p.a. (680 bps)
- **Liquidity:** Instant overnight T+0 liquidity sweep.
- **Capital Protection:** Ultra-short maturity sovereign/AAA debt.
- **Eligible Segments:** `HNI`, `CORPORATE`
- **Eligible Risk Profiles:** `CONSERVATIVE`, `MODERATE`, `AGGRESSIVE`
- **Policy Rules:**
  - Deployed automatically when sudden large cash inflow (>₹10,00,000) is detected to prevent idle cash drag.

---

## 3. Product Substitution and Fallback Rules
1. When an AI candidate proposes an unsuitable product (e.g. `prod-equity-opp` for a `MODERATE` client), the policy engine must reject it.
2. For conservative clients holding maturing deposits, `prod-fd-18m` or `prod-green-bond` are the sole permitted suggestions.
