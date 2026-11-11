import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../features/auth/AuthContext";
import { AppRoutes } from "../app/router";
function renderWithRoute(initialEntries, userRole = null) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });
  if (userRole) {
    const isTl = userRole === "TEAM_LEAD";
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(
      JSON.stringify({
        userId: isTl ? "tl-1" : "rm-1",
        name: isTl ? "Sarah Jenkins" : "Rajesh Kumar",
        email: isTl ? "tl.sarah@bank.com" : "rm.rajesh@bank.com",
        role: userRole,
        team_id: isTl ? "team-lead-ops" : "team-wealth-1"
      })
    );
    const mockToken = `${header}.${payload}.signature`;
    sessionStorage.setItem("bnk10_token", mockToken);
  } else {
    sessionStorage.removeItem("bnk10_token");
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
describe("All Portal Routes Verification", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  it("1. /login renders the LoginPage", async () => {
    renderWithRoute(["/login"]);
    expect(await screen.findByText("APEX PRIVATE BANK")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In to Console/i })).toBeInTheDocument();
  });
  it("2. / redirects unauthenticated user to /login", async () => {
    renderWithRoute(["/"]);
    expect(await screen.findByText("APEX PRIVATE BANK")).toBeInTheDocument();
  });
  it("3. /rm/dashboard renders Portfolio Overview for RM", async () => {
    renderWithRoute(["/rm/dashboard"], "RM");
    expect(await screen.findByRole("heading", { name: "Portfolio Overview" })).toBeInTheDocument();
  });
  it("4. /rm/clients renders Client Directory for RM", async () => {
    renderWithRoute(["/rm/clients"], "RM");
    expect(await screen.findByRole("heading", { name: "Client Directory" })).toBeInTheDocument();
  });
  it("5. /rm/clients/:id renders Client 360 page", async () => {
    renderWithRoute(["/rm/clients/client-1"], "RM");
    expect(await screen.findByText("Total Portfolio AUM")).toBeInTheDocument();
  });
  it("6. /rm/nbas redirects to /rm/clients for RM", async () => {
    renderWithRoute(["/rm/nbas"], "RM");
    expect(await screen.findByRole("heading", { name: "Client Directory" })).toBeInTheDocument();
  });
  it("7. /rm/nbas/:id renders NBA Details Page", async () => {
    renderWithRoute(["/rm/nbas/nba-1"], "RM");
    expect(await screen.findByText(/Back to Client Profile/i)).toBeInTheDocument();
  });
  it("8. /rm/nbas/:id/outreach renders Outreach Composer", async () => {
    renderWithRoute(["/rm/nbas/nba-1/outreach"], "RM");
    expect(await screen.findByRole("heading", { name: /Client Outreach Composer/i })).toBeInTheDocument();
  });
  it("9. /rm/outcomes renders RM Outcome History", async () => {
    renderWithRoute(["/rm/outcomes"], "RM");
    expect(await screen.findByRole("heading", { name: "NBA Outcome History" })).toBeInTheDocument();
  });
  it("10. /team-lead/dashboard renders Team Lead Supervisory Dashboard", async () => {
    renderWithRoute(["/team-lead/dashboard"], "TEAM_LEAD");
    expect(await screen.findByRole("heading", { name: /Supervisor Command Center/i })).toBeInTheDocument();
  });
  it("11. /team-lead/outcomes renders Team Outcomes Audit", async () => {
    renderWithRoute(["/team-lead/outcomes"], "TEAM_LEAD");
    expect(await screen.findByRole("heading", { name: "Team Outcomes Audit" })).toBeInTheDocument();
  });
  it("12. /non-existent-route redirects appropriately without crash", async () => {
    renderWithRoute(["/random-404-path"], "RM");
    expect(await screen.findByRole("heading", { name: "Portfolio Overview" })).toBeInTheDocument();
  });
  it("13. RM user attempting to access /team-lead/dashboard is bounced to /rm/dashboard", async () => {
    renderWithRoute(["/team-lead/dashboard"], "RM");
    expect(await screen.findByRole("heading", { name: "Portfolio Overview" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Supervisor Command Center/i })).not.toBeInTheDocument();
  });
  it("14. Team Lead user attempting to access /rm/dashboard is bounced to /team-lead/dashboard", async () => {
    renderWithRoute(["/rm/dashboard"], "TEAM_LEAD");
    expect(await screen.findByRole("heading", { name: /Supervisor Command Center/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Portfolio Overview" })).not.toBeInTheDocument();
  });
});
