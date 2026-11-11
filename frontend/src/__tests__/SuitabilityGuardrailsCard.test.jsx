import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SuitabilityGuardrailsCard } from "../features/outreach/SuitabilityGuardrailsCard";

describe("SuitabilityGuardrailsCard Component", () => {
  const mockSuitability = {
    is_suitable: true,
    overall_status: "PASS",
    rules: [
      {
        id: "RISK_ALIGNMENT",
        name: "Risk Tolerance Alignment",
        status: "PASS",
        details: "Client risk tolerance (HIGH) aligns with product risk rating (HIGH)."
      },
      {
        id: "MIN_THRESHOLD",
        name: "Minimum Investment & Operational Liquidity Threshold",
        status: "PASS",
        details: "Operational liquid reserve ($3,750,000) comfortably satisfies SIP requirements."
      },
      {
        id: "CONCENTRATION_LIMIT",
        name: "Single-Asset Concentration Cap (35%)",
        status: "PASS",
        details: "Projected 12-month cumulative exposure remains within wealth mandate."
      },
      {
        id: "DUPLICATE_PRODUCT",
        name: "Active Holding & Systematic Mandate Eligibility",
        status: "PASS",
        details: "Active holding verified; vehicle is eligible for systematic SIP mandate."
      }
    ]
  };

  it("renders awaiting state when not loading and draft not yet generated", () => {
    render(
      <SuitabilityGuardrailsCard
        suitability={mockSuitability}
        isLoading={false}
        isDraftGenerated={false}
      />
    );
    expect(screen.getByText(/Suitability Guardrail Evaluation/i)).toBeInTheDocument();
    expect(screen.getByText(/Parallel Suitability Guard Ready/i)).toBeInTheDocument();
    expect(screen.getByText(/Click/i)).toBeInTheDocument();
  });

  it("renders parallel loading state during the 5-second generation pulse", () => {
    render(
      <SuitabilityGuardrailsCard
        suitability={mockSuitability}
        isLoading={true}
        isDraftGenerated={false}
      />
    );
    expect(screen.getByText(/Evaluating 4 suitability guardrails \(5s\)\.\.\./i)).toBeInTheDocument();
    expect(screen.getByText(/03 Suitability Guard running in parallel with 04 Outreach Drafter/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. Risk Tolerance Alignment/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Minimum Investment & Operational Liquidity Threshold/i)).toBeInTheDocument();
  });

  it("renders all 4 evaluated guardrails when draft generation is complete", () => {
    render(
      <SuitabilityGuardrailsCard
        suitability={mockSuitability}
        isLoading={false}
        isDraftGenerated={true}
      />
    );
    expect(screen.getByText(/Deterministic institutional rules/i)).toBeInTheDocument();
    expect(screen.getByText("Risk Tolerance Alignment")).toBeInTheDocument();
    expect(screen.getByText("Minimum Investment & Operational Liquidity Threshold")).toBeInTheDocument();
    expect(screen.getByText("Single-Asset Concentration Cap (35%)")).toBeInTheDocument();
    expect(screen.getByText("Active Holding & Systematic Mandate Eligibility")).toBeInTheDocument();
    expect(screen.getByText(/4 of 4 Verified/i)).toBeInTheDocument();
  });
});

