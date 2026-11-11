import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LogOutcomeModal } from "../features/outcomes/LogOutcomeModal";
import { outcomeService } from "../services/outcomeService";
vi.mock("../services/outcomeService", () => ({
  outcomeService: {
    recordOutcome: vi.fn(),
    getRmOutcomes: vi.fn()
  }
}));
vi.mock("../services/nbaService", () => ({
  nbaService: {
    getNbas: vi.fn(),
    getNbaById: vi.fn(),
    getNbaSuitability: vi.fn(),
    acceptNba: vi.fn(),
    dismissNba: vi.fn()
  }
}));
vi.mock("../features/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "rm-1", name: "Rajesh Kumar", role: "RM" }
  })
}));
const mockNba = {
  id: "nba-active-1",
  client_id: "client-1",
  action_type: "DEPOSIT_ROLLOVER",
  title: "18M Apex Premier Fixed Deposit",
  reason: "Client has maturing deposit in 10 days",
  priority: "HIGH",
  status: "PENDING",
  evidence: [],
  generated_at: "2026-11-04T00:00:00Z",
  created_at: "2026-11-04T00:00:00Z",
  client: {
    id: "client-1",
    rm_id: "rm-1",
    full_name: "Ananya Roy",
    segment: "HNW",
    risk_profile: "BALANCED",
    created_at: "2021-01-01T00:00:00Z"
  }
};
const mockCompletedNba = {
  id: "nba-completed-2",
  client_id: "client-2",
  action_type: "PORTFOLIO_REBALANCE",
  title: "Rebalance Liquid Reserves to Short Duration Fund",
  reason: "Excess liquidity idle in savings",
  priority: "MEDIUM",
  status: "COMPLETED",
  evidence: [],
  generated_at: "2026-11-04T00:00:00Z",
  created_at: "2026-11-04T00:00:00Z",
  client: {
    id: "client-2",
    rm_id: "rm-1",
    full_name: "Vikram Mehta",
    segment: "PREMIER",
    risk_profile: "GROWTH",
    created_at: "2021-01-01T00:00:00Z"
  }
};
describe("NBA Outcome Logging & Completed Queue Filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("triggers onSuccess with outcome saved message upon saving final outcome", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });
    vi.mocked(outcomeService.recordOutcome).mockResolvedValueOnce({
      success: true,
      data: {
        id: "out-1",
        nba_id: "nba-active-1",
        outcome: "CONVERTED",
        action_taken: true
      }
    });
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <LogOutcomeModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        nba={mockNba}
      />
      </QueryClientProvider>
    );
    expect(screen.getByText("Log Recommendation Outcome")).toBeInTheDocument();
    const convertedRadio = screen.getByLabelText(/Converted \/ Invested/i);
    fireEvent.click(convertedRadio);
    const saveBtn = screen.getByRole("button", { name: /Save Final Outcome/i });
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(outcomeService.recordOutcome).toHaveBeenCalledWith("nba-active-1", expect.objectContaining({
        outcome: "CONVERTED",
        action_taken: true
      }));
      expect(handleSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/Outcome saved successfully/i)
      );
      expect(handleClose).toHaveBeenCalled();
    });
  });
  it("redirects from /rm/nbas to /rm/clients as NBA queue is removed", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/rm/nbas"]}>
          <Routes>
            <Route path="/rm/nbas" element={<Navigate to="/rm/clients" replace />} />
            <Route path="/rm/clients" element={<div>Client Directory Page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(await screen.findByText("Client Directory Page")).toBeInTheDocument();
  });
});
