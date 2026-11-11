import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NbaDetailsPage } from "../features/nbas/NbaDetailsPage";
import { nbaService } from "../services/nbaService";
vi.mock("../services/nbaService", () => ({
  nbaService: {
    getNbaById: vi.fn(),
    getNbaSuitability: vi.fn(),
    acceptNba: vi.fn(),
    dismissNba: vi.fn()
  }
}));
const mockPendingNba = {
  id: "nba-test-1",
  client_id: "client-1",
  action_type: "DEPOSIT_ROLLOVER",
  title: "Roll over maturing FD to higher yield deposit",
  reason: "Client has maturing deposit in 10 days",
  priority: "HIGH",
  status: "PENDING",
  evidence: [],
  client: {
    id: "client-1",
    full_name: "Ananya Roy",
    segment: "HNW",
    risk_profile: "BALANCED"
  },
  suitability: {
    is_suitable: true,
    overall_status: "PASS"
  }
};
const mockAcceptedNba = {
  ...mockPendingNba,
  id: "nba-test-2",
  status: "ACTIONED"
};
function renderPage(nbaId) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/rm/nbas/${nbaId}`]}>
        <Routes>
          <Route path="/rm/nbas/:id" element={<NbaDetailsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
describe("NBA Acceptance Gate for Outreach Composer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("disables Outreach Composer button when NBA is PENDING", async () => {
    vi.mocked(nbaService.getNbaById).mockResolvedValue({
      data: mockPendingNba
    });
    vi.mocked(nbaService.getNbaSuitability).mockResolvedValue({
      data: { is_suitable: true, overall_status: "PASS", rules: [] }
    });
    renderPage("nba-test-1");
    expect(await screen.findByText("Accept Recommendation")).toBeInTheDocument();
    expect(screen.getByText(/Accept recommendation first to enable Outreach Composer/i)).toBeInTheDocument();
    const composerBtn = screen.getByRole("button", { name: /Proceed to Outreach Composer/i });
    expect(composerBtn).toBeDisabled();
  });
  it("enables Outreach Composer button after clicking Accept Recommendation", async () => {
    vi.mocked(nbaService.getNbaById).mockResolvedValue({
      data: mockPendingNba
    });
    vi.mocked(nbaService.getNbaSuitability).mockResolvedValue({
      data: { is_suitable: true, overall_status: "PASS", rules: [] }
    });
    vi.mocked(nbaService.acceptNba).mockResolvedValue({
      data: { ...mockPendingNba, status: "ACTIONED" }
    });
    renderPage("nba-test-1");
    const acceptBtn = await screen.findByRole("button", { name: "Accept Recommendation" });
    const composerBtn = screen.getByRole("button", { name: /Proceed to Outreach Composer/i });
    expect(composerBtn).toBeDisabled();
    fireEvent.click(acceptBtn);
    await waitFor(() => {
      expect(nbaService.acceptNba).toHaveBeenCalledWith("nba-test-1");
      expect(composerBtn).toBeEnabled();
    });
  });
  it("enables Outreach Composer button immediately if NBA is already ACTIONED", async () => {
    vi.mocked(nbaService.getNbaById).mockResolvedValue({
      data: mockAcceptedNba
    });
    vi.mocked(nbaService.getNbaSuitability).mockResolvedValue({
      data: { is_suitable: true, overall_status: "PASS", rules: [] }
    });
    renderPage("nba-test-2");
    expect(await screen.findByText("Recommendation Accepted")).toBeInTheDocument();
    const composerBtn = screen.getByRole("button", { name: /Proceed to Outreach Composer/i });
    expect(composerBtn).toBeEnabled();
  });
});
