import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GroundingCitationsCard } from "../features/outreach/GroundingCitationsCard";
describe("GroundingCitationsCard Component", () => {
  it("renders AI synthesis loading state when isLoading is true", () => {
    render(
      <GroundingCitationsCard
        citations={["Institutional Policy Citation: POL-042 Deposit Rollover"]}
        isLoading={true}
      />
    );
    expect(screen.getByText(/Grounding Citations & Signals/i)).toBeInTheDocument();
    expect(screen.getByText(/Synthesizing Citations.../i)).toBeInTheDocument();
    expect(screen.getByText(/AI grounding signals with policy rulebook/i)).toBeInTheDocument();
    expect(screen.getByText("Policy Citation")).toBeInTheDocument();
    expect(screen.getByText("Client Signal")).toBeInTheDocument();
    expect(screen.getByText("Holding Position")).toBeInTheDocument();
  });
  it("renders parsed citations and count badge when loading completes", () => {
    render(
      <GroundingCitationsCard
        citations={[
          "Institutional Policy Citation: POL-042 Deposit Rollover Policy guarantees yield enhancement.",
          "Client Signal: Deposit maturity detected in 12 days for senior tier deposit."
        ]}
        isLoading={false}
      />
    );
    expect(screen.getByText("2 total")).toBeInTheDocument();
    expect(screen.getByText(/POL-042 Deposit Rollover Policy guarantees yield enhancement/i)).toBeInTheDocument();
    expect(screen.getByText(/Deposit maturity detected in 12 days/i)).toBeInTheDocument();
  });
});
