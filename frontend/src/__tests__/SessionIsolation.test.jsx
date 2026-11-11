import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "../features/auth/AuthContext";
import { authService } from "../services/authService";
const TestAuthConsumer = () => {
  const { user, token, isAuthenticated, login, logout } = useAuth();
  return <div>
      <div data-testid="auth-status">{isAuthenticated ? "AUTHENTICATED" : "ANONYMOUS"}</div>
      <div data-testid="user-id">{user?.id || "NO_USER"}</div>
      <div data-testid="user-email">{user?.email || "NO_EMAIL"}</div>
      <div data-testid="user-role">{user?.role || "NO_ROLE"}</div>
      <div data-testid="token">{token || "NO_TOKEN"}</div>
      <button
    onClick={() => login({ email: "rm.rajesh@bank.com", password: "Password123!", role: "RM" })}
  >
        Login RM1
      </button>
      <button
    onClick={() => login({ email: "rm.priya@bank.com", password: "Password123!", role: "RM" })}
  >
        Login RM2
      </button>
      <button
    onClick={() => login({ email: "tl.sarah@bank.com", password: "Password123!", role: "TEAM_LEAD" })}
  >
        Login TL
      </button>
      <button onClick={() => logout()}>Logout</button>
    </div>;
};
const createMockTab = (tabName) => {
  const store = {};
  const mockStorage = {
    getItem: (key) => store[key] ?? null,
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get store() {
      return store;
    }
  };
  return {
    name: tabName,
    storage: mockStorage,
    activate: () => {
      Object.defineProperty(window, "sessionStorage", {
        value: mockStorage,
        writable: true,
        configurable: true
      });
      Object.defineProperty(globalThis, "sessionStorage", {
        value: mockStorage,
        writable: true,
        configurable: true
      });
    }
  };
};
describe("Frontend Session Isolation & Independent Storage Suite (Scenarios 1, 2, 3, 4, 8, 9)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });
  it("Scenario 1: Tab 1 (RM 1) and Tab 2 (RM 2) maintain independent sessions in sessionStorage", async () => {
    const tab1 = createMockTab("Tab-RM1");
    const tab2 = createMockTab("Tab-RM2");
    tab1.activate();
    vi.spyOn(authService, "login").mockResolvedValueOnce({
      success: true,
      data: {
        token: "jwt-rm1-unique-session",
        user: { id: "rm-1", name: "Rajesh Kumar", email: "rm.rajesh@bank.com", role: "RM" }
      }
    });
    const { unmount: unmountTab1 } = render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );
    await act(async () => {
      screen.getByText("Login RM1").click();
    });
    expect(screen.getByTestId("auth-status").textContent).toBe("AUTHENTICATED");
    expect(screen.getByTestId("user-id").textContent).toBe("rm-1");
    expect(tab1.storage.getItem("bnk10_token")).toBe("jwt-rm1-unique-session");
    unmountTab1();
    tab2.activate();
    vi.spyOn(authService, "login").mockResolvedValueOnce({
      success: true,
      data: {
        token: "jwt-rm2-unique-session",
        user: { id: "rm-2", name: "Priya Verma", email: "rm.priya@bank.com", role: "RM" }
      }
    });
    const { unmount: unmountTab2 } = render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );
    await act(async () => {
      screen.getByText("Login RM2").click();
    });
    expect(screen.getByTestId("auth-status").textContent).toBe("AUTHENTICATED");
    expect(screen.getByTestId("user-id").textContent).toBe("rm-2");
    expect(tab2.storage.getItem("bnk10_token")).toBe("jwt-rm2-unique-session");
    unmountTab2();
    expect(tab1.storage.getItem("bnk10_token")).toBe("jwt-rm1-unique-session");
  });
  it("Scenario 2: RM 1 logs out in Tab 1; RM 2 remains authenticated in Tab 2", async () => {
    const tab1 = createMockTab("Tab-RM1");
    const tab2 = createMockTab("Tab-RM2");
    tab1.storage.setItem("bnk10_token", "jwt-rm1-token");
    tab1.storage.setItem(
      "bnk10_user",
      JSON.stringify({ id: "rm-1", name: "Rajesh Kumar", email: "rm.rajesh@bank.com", role: "RM" })
    );
    tab2.storage.setItem("bnk10_token", "jwt-rm2-token");
    tab2.storage.setItem(
      "bnk10_user",
      JSON.stringify({ id: "rm-2", name: "Priya Verma", email: "rm.priya@bank.com", role: "RM" })
    );
    tab1.activate();
    vi.spyOn(authService, "logout").mockResolvedValueOnce({
      success: true,
      data: { message: "Logged out" }
    });
    const { unmount: unmountTab1 } = render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId("auth-status").textContent).toBe("AUTHENTICATED");
    await act(async () => {
      screen.getByText("Logout").click();
    });
    expect(screen.getByTestId("auth-status").textContent).toBe("ANONYMOUS");
    expect(tab1.storage.getItem("bnk10_token")).toBeNull();
    unmountTab1();
    tab2.activate();
    const { unmount: unmountTab2 } = render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId("auth-status").textContent).toBe("AUTHENTICATED");
    expect(screen.getByTestId("user-id").textContent).toBe("rm-2");
    expect(screen.getByTestId("token").textContent).toBe("jwt-rm2-token");
    expect(tab2.storage.getItem("bnk10_token")).toBe("jwt-rm2-token");
    unmountTab2();
  });
  it("Scenario 3: RM 2 logs out in Tab 2; RM 1 remains authenticated in Tab 1", async () => {
    const tab1 = createMockTab("Tab-RM1");
    const tab2 = createMockTab("Tab-RM2");
    tab1.storage.setItem("bnk10_token", "jwt-rm1-token");
    tab1.storage.setItem(
      "bnk10_user",
      JSON.stringify({ id: "rm-1", name: "Rajesh Kumar", email: "rm.rajesh@bank.com", role: "RM" })
    );
    tab2.storage.setItem("bnk10_token", "jwt-rm2-token");
    tab2.storage.setItem(
      "bnk10_user",
      JSON.stringify({ id: "rm-2", name: "Priya Verma", email: "rm.priya@bank.com", role: "RM" })
    );
    tab2.activate();
    vi.spyOn(authService, "logout").mockResolvedValueOnce({
      success: true,
      data: { message: "Logged out" }
    });
    const { unmount: unmountTab2 } = render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );
    await act(async () => {
      screen.getByText("Logout").click();
    });
    expect(screen.getByTestId("auth-status").textContent).toBe("ANONYMOUS");
    expect(tab2.storage.getItem("bnk10_token")).toBeNull();
    unmountTab2();
    tab1.activate();
    const { unmount: unmountTab1 } = render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId("auth-status").textContent).toBe("AUTHENTICATED");
    expect(screen.getByTestId("user-id").textContent).toBe("rm-1");
    expect(tab1.storage.getItem("bnk10_token")).toBe("jwt-rm1-token");
    unmountTab1();
  });
  it("Scenario 4: Team Lead logs in independently; remains authenticated when RM logs out", async () => {
    const rmTab = createMockTab("Tab-RM");
    const tlTab = createMockTab("Tab-TL");
    rmTab.storage.setItem("bnk10_token", "jwt-rm-token");
    rmTab.storage.setItem(
      "bnk10_user",
      JSON.stringify({ id: "rm-1", name: "Rajesh Kumar", email: "rm.rajesh@bank.com", role: "RM" })
    );
    tlTab.storage.setItem("bnk10_token", "jwt-tl-token");
    tlTab.storage.setItem(
      "bnk10_user",
      JSON.stringify({ id: "tl-1", name: "Sarah Jenkins", email: "tl.sarah@bank.com", role: "TEAM_LEAD" })
    );
    rmTab.activate();
    vi.spyOn(authService, "logout").mockResolvedValueOnce({
      success: true,
      data: { message: "Logged out" }
    });
    const { unmount: unmountRm } = render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );
    await act(async () => {
      screen.getByText("Logout").click();
    });
    unmountRm();
    tlTab.activate();
    const { unmount: unmountTl } = render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId("auth-status").textContent).toBe("AUTHENTICATED");
    expect(screen.getByTestId("user-role").textContent).toBe("TEAM_LEAD");
    expect(screen.getByTestId("token").textContent).toBe("jwt-tl-token");
    unmountTl();
  });
  it("Scenario 8: Refreshing the page preserves session from sessionStorage", () => {
    sessionStorage.setItem("bnk10_token", "persisted-session-token-999");
    sessionStorage.setItem(
      "bnk10_user",
      JSON.stringify({ id: "rm-1", name: "Rajesh Kumar", email: "rm.rajesh@bank.com", role: "RM" })
    );
    const { unmount } = render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId("auth-status").textContent).toBe("AUTHENTICATED");
    expect(screen.getByTestId("user-id").textContent).toBe("rm-1");
    expect(screen.getByTestId("token").textContent).toBe("persisted-session-token-999");
    unmount();
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId("auth-status").textContent).toBe("AUTHENTICATED");
    expect(screen.getByTestId("user-id").textContent).toBe("rm-1");
    expect(screen.getByTestId("token").textContent).toBe("persisted-session-token-999");
  });
  it("Scenario 9: Logging out and logging back in works cleanly", async () => {
    sessionStorage.setItem("bnk10_token", "initial-token");
    sessionStorage.setItem(
      "bnk10_user",
      JSON.stringify({ id: "rm-1", name: "Rajesh Kumar", email: "rm.rajesh@bank.com", role: "RM" })
    );
    const { unmount } = render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId("auth-status").textContent).toBe("AUTHENTICATED");
    vi.spyOn(authService, "logout").mockResolvedValueOnce({
      success: true,
      data: { message: "Logged out" }
    });
    await act(async () => {
      screen.getByText("Logout").click();
    });
    expect(screen.getByTestId("auth-status").textContent).toBe("ANONYMOUS");
    expect(sessionStorage.getItem("bnk10_token")).toBeNull();
    vi.spyOn(authService, "login").mockResolvedValueOnce({
      success: true,
      data: {
        token: "new-login-token-777",
        user: { id: "rm-1", name: "Rajesh Kumar", email: "rm.rajesh@bank.com", role: "RM" }
      }
    });
    await act(async () => {
      screen.getByText("Login RM1").click();
    });
    expect(screen.getByTestId("auth-status").textContent).toBe("AUTHENTICATED");
    expect(screen.getByTestId("token").textContent).toBe("new-login-token-777");
    expect(sessionStorage.getItem("bnk10_token")).toBe("new-login-token-777");
    unmount();
  });
});
