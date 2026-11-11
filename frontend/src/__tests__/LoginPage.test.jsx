import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";
import { AuthProvider } from "../features/auth/AuthContext";
import { authService } from "../services/authService";
vi.mock("../services/authService", () => ({
  authService: {
    login: vi.fn()
  }
}));
describe("LoginPage Component", () => {
  it("renders login form with empty input fields for manual entry", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText("APEX PRIVATE BANK")).toBeInTheDocument();
    expect(screen.getByText(/Institutional Email/i)).toBeInTheDocument();
    expect(screen.getByText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name@bank.com").value).toBe("");
    expect(screen.getByPlaceholderText("••••••••").value).toBe("");
    expect(screen.getByRole("button", { name: /Sign In to Console/i })).toBeInTheDocument();
  });
  it("switches to Team Lead portal tab on button click without auto-filling values", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );
    const tlPortalTab = screen.getByText("Team Lead Portal");
    fireEvent.click(tlPortalTab);
    expect(tlPortalTab).toHaveClass("bg-color-2");
    const emailInput = screen.getByPlaceholderText("name@bank.com");
    expect(emailInput.value).toBe("");
  });
  it("switches back to RM Console tab on click without auto-filling values", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );
    const tlPortalTab = screen.getByText("Team Lead Portal");
    fireEvent.click(tlPortalTab);
    const rmPortalTab = screen.getByText("RM Console");
    fireEvent.click(rmPortalTab);
    expect(rmPortalTab).toHaveClass("bg-color-2");
    const emailInput = screen.getByPlaceholderText("name@bank.com");
    expect(emailInput.value).toBe("");
  });
  it("triggers login service on submit with manually entered credentials", async () => {
    const mockLogin = vi.mocked(authService.login).mockResolvedValueOnce({
      success: true,
      data: {
        token: "mock-jwt-token",
        user: {
          id: "rm-1",
          name: "Rajesh Kumar",
          email: "rm.rajesh@bank.com",
          role: "RM"
        }
      }
    });
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );
    const emailInput = screen.getByPlaceholderText("name@bank.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");
    fireEvent.change(emailInput, { target: { value: "rm.rajesh@bank.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    const submitBtn = screen.getByRole("button", { name: /Sign In to Console/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "rm.rajesh@bank.com",
        password: "Password123!",
        role: "RM"
      });
    });
  });
  it("displays role mismatch error message and stays on login page when role does not match", async () => {
    vi.mocked(authService.login).mockRejectedValueOnce(
      new Error('Access denied: Account "tl.sarah@bank.com" is registered as TEAM_LEAD. Please switch to the "Team Lead Portal" tab to sign in.')
    );
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );
    const emailInput = screen.getByPlaceholderText("name@bank.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");
    fireEvent.change(emailInput, { target: { value: "tl.sarah@bank.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    const submitBtn = screen.getByRole("button", { name: /Sign In to Console/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/registered as TEAM_LEAD/i)).toBeInTheDocument();
    });
  });
});
