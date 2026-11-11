import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Client360Page } from "../features/clients/Client360Page";
import { AuthProvider } from "../features/auth/AuthContext";
function renderClient360(clientId = "c-101") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });
  sessionStorage.setItem("bnk10_token", "mock-bearer-token-12345");
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[`/rm/clients/${clientId}`]}>
          <Routes>
            <Route path="/rm/clients/:id" element={<Client360Page />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
describe("Client360Page Component", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  it("renders Client 360 overview, portfolio AUM and holdings", async () => {
    renderClient360("c-101");
    expect(await screen.findByText(/Total Portfolio AUM/i)).toBeInTheDocument();
    expect(screen.getByText(/Back to Client Directory/i)).toBeInTheDocument();
    expect(screen.getByText("Vikram Mehta")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Generate Recommendations/i })[0]).toBeInTheDocument();
  });
  it("allows switching between Holdings and NBAs tabs smoothly and displays standby state initially", async () => {
    renderClient360("c-101");
    await screen.findByText(/Total Portfolio AUM/i);
    const nbasTab = screen.getByRole("button", { name: /Next-Best-Actions/i });
    fireEvent.click(nbasTab);
    expect(await screen.findByText(/Next-Best-Actions Not Yet Generated/i)).toBeInTheDocument();
  });
  it("handles generate recommendations mutation to reveal signals and NBAs", async () => {
    renderClient360("c-101");
    await screen.findByText(/Total Portfolio AUM/i);
    const generateBtn = screen.getAllByRole("button", { name: /Generate Recommendations/i })[0];
    fireEvent.click(generateBtn);
    await waitFor(
      () => {
        expect(screen.getByText(/Fresh AI recommendations generated/i)).toBeInTheDocument();
      },
      { timeout: 4e3 }
    );
    expect(await screen.findByText(/Review Details/i)).toBeInTheDocument();
  });
});
