import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "../components/common/StatusBadge";
describe("StatusBadge Component", () => {
  it("renders status text formatted with underscores replaced", () => {
    render(<StatusBadge status="FOLLOW_UP_REQUIRED" />);
    expect(screen.getByText("FOLLOW UP REQUIRED")).toBeInTheDocument();
  });
  it("renders ACTIVE status with blue theme classes", () => {
    const { container } = render(<StatusBadge status="ACTIVE" />);
    const span = container.querySelector("span");
    expect(span).toHaveClass("text-blue-700");
  });
  it("renders PASS status with emerald theme classes", () => {
    const { container } = render(<StatusBadge status="PASS" />);
    const span = container.querySelector("span");
    expect(span).toHaveClass("text-emerald-700");
  });
  it("renders FAIL status with red theme classes", () => {
    const { container } = render(<StatusBadge status="FAIL" />);
    const span = container.querySelector("span");
    expect(span).toHaveClass("text-red-700");
  });
});
