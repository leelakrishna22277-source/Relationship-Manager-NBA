import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TeamLeadDashboardPage } from "../features/team-lead/TeamLeadDashboardPage";
import { teamLeadService } from "../services/teamLeadService";
vi.mock("../services/teamLeadService", () => ({
  teamLeadService: {
    getDashboard: vi.fn(),
    getTeamRms: vi.fn()
  }
}));
describe("TeamLeadDashboardPage Component", () => {
  let queryClient;
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
  });
  it("renders supervisory KPI metrics and RM leaderboard", async () => {
    vi.mocked(teamLeadService.getDashboard).mockResolvedValueOnce({
      success: true,
      data: {
        teamName: "North Zone Wealth Advisory",
        totalRms: 2,
        totalClients: 46,
        assignedClients: 46,
        unassignedClients: 0,
        totalRecommendations: 18,
        teamActedOnRate: 0.82,
        outcomesBreakdown: {
          CONVERTED: 14,
          INTERESTED: 11,
          FOLLOW_UP_REQUIRED: 6,
          NOT_INTERESTED: 4
        },
        rmPerformance: [
          {
            rmId: "rm-1",
            rmName: "Rajesh Kumar",
            clientsCount: 23,
            activeNbas: 15,
            actedOnRate: 0.88
          },
          {
            rmId: "rm-2",
            rmName: "Priya Verma",
            clientsCount: 23,
            activeNbas: 12,
            actedOnRate: 0.79
          }
        ]
      }
    });
    render(
      <QueryClientProvider client={queryClient}>
        <TeamLeadDashboardPage />
      </QueryClientProvider>
    );
    expect(screen.getByText("Loading supervisory team intelligence...")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/North Zone Wealth Advisory/i)).toBeInTheDocument();
      expect(screen.getByText("Active Relationship Managers")).toBeInTheDocument();
      expect(screen.getAllByText("Rajesh Kumar").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Priya Verma").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("PII Masking Active")).not.toBeInTheDocument();
    });
  });
  it("renders 46 clients coverage assigned equally to both RMs (23 each)", async () => {
    vi.mocked(teamLeadService.getDashboard).mockResolvedValueOnce({
      success: true,
      data: {
        teamName: "North Zone Wealth Advisory",
        totalRms: 2,
        totalClients: 46,
        assignedClients: 46,
        unassignedClients: 0,
        totalRecommendations: 18,
        teamActedOnRate: 0.81,
        outcomesBreakdown: { CONVERTED: 14, INTERESTED: 11 },
        rmPerformance: [
          { rmId: "rm-1", rmName: "Rajesh Kumar", clientsCount: 23, activeNbas: 5, actedOnRate: 0.88 },
          { rmId: "rm-2", rmName: "Priya Verma", clientsCount: 23, activeNbas: 4, actedOnRate: 0.82 }
        ]
      }
    });
    render(
      <QueryClientProvider client={queryClient}>
        <TeamLeadDashboardPage />
      </QueryClientProvider>
    );
    await waitFor(() => {
      expect(screen.getAllByText("46").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("All 46 Clients Fully Assigned")).toBeInTheDocument();
      expect(screen.queryByText("Unallocated Pool")).not.toBeInTheDocument();
    });
  });
});
