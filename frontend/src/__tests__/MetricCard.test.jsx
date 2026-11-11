import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TrendingUp } from "lucide-react";
import { MetricCard } from "../components/common/MetricCard";
describe("MetricCard Component", () => {
  it("renders title, value, and subtitle properly", () => {
    render(
      <MetricCard
        title="Total Managed AUM"
        value="$12.4M"
        subtitle="18 active client portfolios"
        icon={TrendingUp}
      />
    );
    expect(screen.getByText("Total Managed AUM")).toBeInTheDocument();
    expect(screen.getByText("$12.4M")).toBeInTheDocument();
    expect(screen.getByText("18 active client portfolios")).toBeInTheDocument();
  });
  it("renders positive trend indicator when trend is positive", () => {
    render(
      <MetricCard
        title="Adoption Velocity"
        value="84%"
        trend={{ value: "+12%", isPositive: true }}
      />
    );
    expect(screen.getByText("+12%")).toBeInTheDocument();
  });
  it("handles optional click action", () => {
    const handleClick = vi.fn();
    render(
      <MetricCard
        title="Maturing Deposits"
        value="5"
        onClick={handleClick}
      />
    );
    fireEvent.click(screen.getByText("Maturing Deposits"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
