import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LogOutcomeModal } from "../features/outcomes/LogOutcomeModal";
import { outcomeService } from "../services/outcomeService";
vi.mock("../services/outcomeService", () => ({
  outcomeService: {
    recordOutcome: vi.fn()
  }
}));
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});
const mockNba = {
  id: "nba-101",
  client_id: "client-1",
  action_type: "DEPOSIT_ROLLOVER",
  title: "Roll over maturing FD to higher yield deposit",
  reason: "Client has $50k deposit maturing next week",
  evidence: [],
  priority: "HIGH",
  status: "ACTIVE",
  generated_at: (/* @__PURE__ */ new Date()).toISOString(),
  created_at: (/* @__PURE__ */ new Date()).toISOString(),
  client: {
    id: "client-1",
    rm_id: "rm-1",
    full_name: "Vikram Mehta",
    email: "vikram@example.com",
    phone: "+919876543210",
    segment: "HNI",
    risk_profile: "MODERATE",
    total_balance: 25e4,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  }
};
describe("LogOutcomeModal Component", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <LogOutcomeModal isOpen={false} onClose={vi.fn()} nba={mockNba} />
      </QueryClientProvider>
    );
    expect(container.firstChild).toBeNull();
  });
  it("renders modal with recommendation title and outcome options when open", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LogOutcomeModal isOpen={true} onClose={vi.fn()} nba={mockNba} />
      </QueryClientProvider>
    );
    expect(screen.getByText("Log Recommendation Outcome")).toBeInTheDocument();
    expect(screen.getByText("Client Interested")).toBeInTheDocument();
    expect(screen.getByText("Converted / Invested")).toBeInTheDocument();
  });
  it("submits outcome via outcomeService when form is submitted", async () => {
    const mockRecord = vi.mocked(outcomeService.recordOutcome).mockResolvedValueOnce({
      success: true,
      data: {
        id: "outcome-1",
        nba_id: "nba-101",
        recorded_by_rm_id: "rm-1",
        action_taken: true,
        outcome: "INTERESTED",
        notes: "Client liked the rates",
        follow_up_date: null,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    const handleClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <LogOutcomeModal isOpen={true} onClose={handleClose} nba={mockNba} />
      </QueryClientProvider>
    );
    const submitBtn = screen.getByRole("button", { name: /Save Final Outcome/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(mockRecord).toHaveBeenCalledWith(
        "nba-101",
        expect.objectContaining({
          outcome: "INTERESTED",
          action_taken: true
        })
      );
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
