import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LogContactActivityModal } from "../features/outcomes/LogContactActivityModal";
import { outreachService } from "../services/outreachService";
vi.mock("../services/outreachService", () => ({
  outreachService: {
    recordContactActivity: vi.fn()
  }
}));
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});
describe("LogContactActivityModal Component", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <LogContactActivityModal
        isOpen={false}
        onClose={vi.fn()}
        outreachId="outreach-123"
        clientName="Ananya Sharma"
      />
      </QueryClientProvider>
    );
    expect(container.firstChild).toBeNull();
  });
  it("renders modal with client name and communication method buttons when open", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LogContactActivityModal
        isOpen={true}
        onClose={vi.fn()}
        outreachId="outreach-123"
        clientName="Ananya Sharma"
        defaultMethod="CALL"
      />
      </QueryClientProvider>
    );
    expect(screen.getByText("Log Contact Activity")).toBeInTheDocument();
    expect(screen.getByText("Ananya Sharma")).toBeInTheDocument();
    expect(screen.getByText("Phone Call")).toBeInTheDocument();
    expect(screen.getByText("Client Reached & Spoke")).toBeInTheDocument();
  });
  it("submits contact activity via service when form is submitted", async () => {
    const mockRecord = vi.mocked(outreachService.recordContactActivity).mockResolvedValueOnce({
      success: true,
      data: {
        id: "activity-1",
        outreach_id: "outreach-123",
        rm_id: "rm-1",
        contact_method: "CALL",
        contact_status: "CONTACTED",
        notes: "Spoke with client regarding maturity",
        follow_up_date: null,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    const handleClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <LogContactActivityModal
        isOpen={true}
        onClose={handleClose}
        outreachId="outreach-123"
        clientName="Ananya Sharma"
      />
      </QueryClientProvider>
    );
    const submitBtn = screen.getByRole("button", { name: /Save Activity/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(mockRecord).toHaveBeenCalledWith(
        "outreach-123",
        expect.objectContaining({
          contact_method: "CALL",
          contact_status: "CONTACTED"
        })
      );
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
