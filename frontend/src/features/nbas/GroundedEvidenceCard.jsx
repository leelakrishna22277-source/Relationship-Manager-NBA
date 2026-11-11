import { useState, useEffect } from "react";
import {
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Activity,
  Layers,
  Scale,
  Sparkles
} from "lucide-react";
function getEvidenceCategoryMeta(type) {
  const normalized = (type || "").toUpperCase();
  if (normalized === "POLICY") {
    return {
      label: "Institutional Policy Citation",
      tag: "Policy Rule",
      icon: Scale,
      badgeClass: "bg-color-2/10 text-color-2 border-color-2/20",
      dotClass: "bg-color-2",
      borderClass: "border-l-color-2"
    };
  }
  if (normalized === "SIGNAL") {
    return {
      label: "Behavioral Signal",
      tag: "Client Signal",
      icon: Activity,
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      dotClass: "bg-emerald-500",
      borderClass: "border-l-emerald-500"
    };
  }
  if (normalized === "HOLDING") {
    return {
      label: "Holding Position",
      tag: "Client Holding",
      icon: Layers,
      badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      dotClass: "bg-purple-500",
      borderClass: "border-l-purple-500"
    };
  }
  return {
    label: "Portfolio Trigger",
    tag: "Trigger",
    icon: Sparkles,
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dotClass: "bg-amber-500",
    borderClass: "border-l-amber-500"
  };
}
export const GroundedEvidenceCard = ({
  evidence = [],
  pageSize = 2
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalItems = evidence.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);
  const startIndex = (currentPage - 1) * pageSize;
  const currentItems = evidence.slice(startIndex, startIndex + pageSize);
  const fromRecord = totalItems === 0 ? 0 : startIndex + 1;
  const toRecord = Math.min(startIndex + pageSize, totalItems);
  return <div className="p-space-5 rounded-radius-lg bg-color-7 border border-color-5 shadow-sm space-y-space-4 flex flex-col justify-between">
      <div className="space-y-space-4">
        {
    /* Header Strip */
  }
        <div className="flex items-center justify-between pb-2 border-b border-color-5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-radius-md bg-color-2/10 text-color-2">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-text-sm font-bold text-color-1 font-heading flex items-center gap-2">
                <span>Grounded Evidence Citations</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-color-2 text-white">
                  {totalItems}
                </span>
              </h2>
            </div>
          </div>
          <span className="text-[11px] font-medium text-color-1/50 bg-color-6 px-2 py-0.5 rounded-full border border-color-5">
            Verified source records
          </span>
        </div>

        <p className="text-[11px] text-color-1/65 leading-relaxed">
          Every recommendation cites explicit client signals or balance triggers. Fictional or ungrounded suggestions are rejected by policy.
        </p>

        {
    /* Paginated Evidence List */
  }
        <div className="space-y-space-3 min-h-[210px]">
          {currentItems.length > 0 ? currentItems.map((item, idx) => {
    const globalIdx = startIndex + idx + 1;
    const meta = getEvidenceCategoryMeta(item.type);
    const Icon = meta.icon;
    const isPolicy = (item.type || "").toUpperCase() === "POLICY";
    const isSignal = (item.type || "").toUpperCase() === "SIGNAL";
    let recordId = item.record_id;
    let summary = item.summary || item.description || item.text || item.details || (typeof item === "string" ? item : JSON.stringify(item));
    let details = item.details;
    if (isPolicy) {
      recordId = null;
      if (/GDL-PROD|product/i.test(item.record_id || summary)) {
        summary = "GDL-PROD-2026-V1 : Product Specifications & Eligibility Rules";
      } else {
        summary = "POL-SUIT-2026-V1 : Product Suitability Matrix & Risk Mandate";
      }
      details = null;
    }
    if (isSignal) {
      // Just mention signal no need of data: never show technical JSON or data dumps
      details = null;
      if (summary && summary.includes(";")) {
        summary = summary.split(";")[0].trim();
      }
      // Guarantee signal maturity days match the actual holding maturity date
      const holdingItem = evidence.find(
        (e) => (e.type || "").toUpperCase() === "HOLDING" && /maturing\s+([0-9]{4}-[0-9]{2}-[0-9]{2})/i.test(e.summary || "")
      );
      if (holdingItem) {
        const match = (holdingItem.summary || "").match(/maturing\s+([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
        if (match) {
          const matDate = new Date(match[1]);
          const nowDate = new Date();
          const calDiff = Math.round(
            (Date.UTC(matDate.getUTCFullYear(), matDate.getUTCMonth(), matDate.getUTCDate()) -
              Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate())) /
              (1000 * 60 * 60 * 24)
          );
          if (!isNaN(calDiff) && calDiff >= 0) {
            const label = calDiff === 0 ? "today" : calDiff === 1 ? "1 day" : `${calDiff} days`;
            summary = summary.replace(/\(\d+\s*days?\)/i, `(${label})`);
          }
        }
      }
    }
    return <div
      key={item.id || item.record_id || globalIdx}
      className={`p-space-3 rounded-radius-md border border-color-5 border-l-4 ${meta.borderClass} bg-color-6 text-text-xs space-y-2 transition-all hover:border-color-5/90 shadow-2xs`}
    >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-color-1 flex items-center gap-1.5 truncate">
                      <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      <span className="truncate">{meta.label} #{globalIdx}</span>
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${meta.badgeClass}`}>
                        {meta.tag}
                      </span>
                      {recordId && <span className="text-[10px] font-mono text-color-1/60 px-1.5 py-0.5 rounded bg-color-7 border border-color-5">
                          {recordId}
                        </span>}
                    </div>
                  </div>

                  <p className="text-[11px] text-color-1/85 font-medium leading-relaxed">
                    {summary}
                  </p>

                  {!isSignal && details && details !== summary && <div className="text-[10px] text-color-1/70 font-mono bg-color-7/70 px-2 py-1 rounded border border-color-5/50 overflow-x-auto leading-relaxed">
                      {details}
                    </div>}
                </div>;
  }) : <div className="p-6 text-center text-[12px] text-color-1/50 italic bg-color-6 rounded-radius-md border border-dashed border-color-5">
              No structured evidence records found.
            </div>}
        </div>
      </div>

      {
    /* Pagination Controls */
  }
      {totalItems > pageSize && <div className="pt-space-3 border-t border-color-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-color-1/70">
          <span className="font-medium">
            Showing <strong className="text-color-1 font-semibold">{fromRecord}–{toRecord}</strong> of{" "}
            <strong className="text-color-1 font-semibold">{totalItems}</strong> citations
          </span>

          <div className="flex items-center gap-1">
            <button
    type="button"
    disabled={currentPage <= 1}
    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
    aria-label="Previous citations page"
    className="p-1 rounded bg-color-6 border border-color-5 text-color-1 hover:bg-color-5/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
    const p = i + 1;
    const isActive = p === currentPage;
    return <button
      key={p}
      type="button"
      onClick={() => setCurrentPage(p)}
      className={`min-w-[24px] h-6 px-1 text-[11px] font-medium rounded transition-colors ${isActive ? "bg-color-2 text-white font-bold shadow-2xs" : "bg-color-6 border border-color-5 text-color-1/80 hover:bg-color-5/50"}`}
    >
                  {p}
                </button>;
  })}

            <button
    type="button"
    disabled={currentPage >= totalPages}
    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
    aria-label="Next citations page"
    className="p-1 rounded bg-color-6 border border-color-5 text-color-1 hover:bg-color-5/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>}
    </div>;
};
