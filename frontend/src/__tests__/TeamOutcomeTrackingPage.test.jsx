import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TeamOutcomeTrackingPage } from "../features/team-lead/TeamOutcomeTrackingPage";
import { teamLeadService } from "../services/teamLeadService";
vi.mock("../services/teamLeadService", () => ({
  teamLeadService: {
    getTeamOutcomes: vi.fn()
  }
}));
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false }
  }
});
describe("TeamOutcomeTrackingPage Component", () => {
  it("renders Team Outcomes Audit header, filters, and outcome rows", async () => {
    vi.mocked(teamLeadService.getTeamOutcomes).mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: "out-1",
          nba_id: "nba-101",
          recorded_by_rm_id: "rm-1",
          action_taken: true,
          outcome: "CONVERTED",
          notes: "Client authorized rollover into 18M Fixed Deposit.",
          follow_up_date: null,
          created_at: "2026-11-02T16:30:00Z",
          nba: {
            id: "nba-101",
            title: "18-Month Term Deposit Rollover",
            action_type: "PORTFOLIO_REBALANCE",
            client: {
              id: "c-101",
              full_name: "Aditi Sharma",
              segment: "HNI"
            }
          }
        },
        {
          id: "out-2",
          nba_id: "nba-102",
          recorded_by_rm_id: "rm-2",
          action_taken: true,
          outcome: "INTERESTED",
          notes: "Client requested green bond term sheet.",
          follow_up_date: "2026-11-06T00:00:00Z",
          created_at: "2026-11-01T14:00:00Z",
          nba: {
            id: "nba-102",
            title: "Sovereign Green Bond Allocation",
            action_type: "CROSS_SELL",
            client: {
              id: "c-102",
              full_name: "Vikram Mehta",
              segment: "PREMIER"
            }
          }
        }
      ]
    });
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <TeamOutcomeTrackingPage />
      </QueryClientProvider>
    );
    expect(screen.getByText("Team Outcomes Audit")).toBeInTheDocument();
    expect(screen.queryByText("Direct Client PII Masked")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(teamLeadService.getTeamOutcomes).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText(/18-Month Term Deposit Rollover/i)).toBeInTheDocument();
      expect(screen.getByText(/Sovereign Green Bond Allocation/i)).toBeInTheDocument();
      expect(screen.getByText("Aditi Sharma")).toBeInTheDocument();
      expect(screen.getByText("Vikram Mehta")).toBeInTheDocument();
      expect(screen.getAllByText("Converted").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Interested").length).toBeGreaterThanOrEqual(1);
    });
    const searchInput = screen.getByPlaceholderText(/Search by client, RM, or recommendation.../i);
    fireEvent.change(searchInput, { target: { value: "Green Bond" } });
    expect(screen.getByText(/Sovereign Green Bond Allocation/i)).toBeInTheDocument();
    expect(screen.queryByText(/18-Month Term Deposit Rollover/i)).not.toBeInTheDocument();
  });
});
