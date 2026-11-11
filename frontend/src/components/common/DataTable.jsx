import { ChevronLeft, ChevronRight } from "lucide-react";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";
export function DataTable({
  columns,
  data,
  isLoading,
  emptyTitle,
  emptyMessage,
  page,
  totalPages,
  onPageChange,
  onRowClick
}) {
  if (isLoading) {
    return <LoadingState message="Loading records..." />;
  }
  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }
  return <div className="bg-color-7 border border-color-5 rounded-radius-lg overflow-hidden shadow-sm flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-text-xs">
          <thead className="bg-color-6 border-b border-color-5 text-color-1/70 uppercase tracking-wider font-semibold">
            <tr>
              {columns.map((col) => <th key={col.key} className={`px-space-4 py-space-3 ${col.className || ""}`}>
                  {col.header}
                </th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-color-5 text-color-1/90">
            {data.map((row, idx) => <tr
    key={row.id ? String(row.id) : idx}
    onClick={() => onRowClick && onRowClick(row)}
    className={`transition-colors ${onRowClick ? "cursor-pointer hover:bg-color-6/60" : "hover:bg-color-6/30"}`}
  >
                {columns.map((col) => <td key={col.key} className={`px-space-4 py-space-3.5 ${col.className || ""}`}>
                    {col.render ? col.render(row) : row[col.key] != null ? String(row[col.key]) : "\u2014"}
                  </td>)}
              </tr>)}
          </tbody>
        </table>
      </div>

      {totalPages && totalPages > 1 && onPageChange && page && <div className="flex items-center justify-between p-space-3 border-t border-color-5 bg-color-6/40 text-text-xs text-color-1/60">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-space-2">
            <button
    type="button"
    disabled={page <= 1}
    onClick={() => onPageChange(page - 1)}
    className="p-1 rounded-radius-sm border border-color-5 hover:bg-color-5 disabled:opacity-30 disabled:cursor-not-allowed"
    aria-label="Previous page"
  >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
    type="button"
    disabled={page >= totalPages}
    onClick={() => onPageChange(page + 1)}
    className="p-1 rounded-radius-sm border border-color-5 hover:bg-color-5 disabled:opacity-30 disabled:cursor-not-allowed"
    aria-label="Next page"
  >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>}
    </div>;
}
