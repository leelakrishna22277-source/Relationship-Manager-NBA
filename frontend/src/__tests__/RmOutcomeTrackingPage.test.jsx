import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RmOutcomeTrackingPage } from "../features/outcomes/RmOutcomeTrackingPage";
import { outcomeService } from "../services/outcomeService";
vi.mock("../services/outcomeService", () => ({
  outcomeService: {
    getRmOutcomes: vi.fn()
  }
}));
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});
describe("RmOutcomeTrackingPage Component", () => {
  it("renders outcome audit records and summary statistics", async () => {
    vi.mocked(outcomeService.getRmOutcomes).mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: "outcome-1",
          nba_id: "nba-1",
          recorded_by_rm_id: "rm-1",
          action_taken: true,
          outcome: "CONVERTED",
          notes: "Customer agreed to 12-month deposit at 5.5%",
          follow_up_date: null,
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          nba: {
            id: "nba-1",
            client_id: "client-1",
            action_type: "DEPOSIT_ROLLOVER",
            title: "12-Month High Yield FD Rollover",
            reason: "Deposit maturing",
            evidence: [],
            priority: "HIGH",
            status: "ACTIONED",
            generated_at: (/* @__PURE__ */ new Date()).toISOString(),
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            client: {
              id: "client-1",
              rm_id: "rm-1",
              full_name: "Anita Desai",
              email: "anita@example.com",
              phone: "+919876543210",
              segment: "PREMIER",
              risk_profile: "CONSERVATIVE",
              total_balance: 18e4,
              created_at: (/* @__PURE__ */ new Date()).toISOString()
            }
          }
        }
      ]
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <RmOutcomeTrackingPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    await waitFor(() => {
      expect(screen.getByText("NBA Outcome History")).toBeInTheDocument();
      expect(screen.getByText("Anita Desai")).toBeInTheDocument();
      expect(screen.getByText("12-Month High Yield FD Rollover")).toBeInTheDocument();
      expect(screen.getByText("Converted Deals")).toBeInTheDocument();
    });
  });
});
