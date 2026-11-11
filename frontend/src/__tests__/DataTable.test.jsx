import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DataTable } from "../components/common/DataTable";
describe("DataTable Component", () => {
  const columns = [
    { key: "name", header: "Name", render: (row) => <span>{row.name}</span> },
    { key: "role", header: "Role", render: (row) => <span>{row.role}</span> }
  ];
  it("renders loading state when isLoading is true", () => {
    render(<DataTable columns={columns} data={[]} isLoading={true} />);
    expect(screen.getByText("Loading records...")).toBeInTheDocument();
  });
  it("renders empty state when data array is empty", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyTitle="No Items"
        emptyMessage="List is currently empty."
      />
    );
    expect(screen.getByText("No Items")).toBeInTheDocument();
    expect(screen.getByText("List is currently empty.")).toBeInTheDocument();
  });
  it("renders rows and responds to row click events", () => {
    const rows = [
      { id: "1", name: "John Doe", role: "Relationship Manager" },
      { id: "2", name: "Jane Smith", role: "Team Lead" }
    ];
    const handleRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={rows}
        onRowClick={handleRowClick}
      />
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    fireEvent.click(screen.getByText("John Doe"));
    expect(handleRowClick).toHaveBeenCalledWith(rows[0]);
  });
});
