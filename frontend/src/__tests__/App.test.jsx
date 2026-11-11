import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "../App";
describe("App Root Integration", () => {
  it("renders application and redirects unauthenticated user to login", () => {
    sessionStorage.clear();
    render(<App />);
    expect(screen.getByText("APEX PRIVATE BANK")).toBeInTheDocument();
    expect(screen.getByText("Relationship Manager Next-Best-Action Console")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In to Console/i })).toBeInTheDocument();
  });
});
