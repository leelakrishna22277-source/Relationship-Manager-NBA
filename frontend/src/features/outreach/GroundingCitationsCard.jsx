import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Activity,
  Layers,
  Scale,
  Sparkles,
  Percent,
  FileCheck2
} from "lucide-react";
function parseCitation(raw) {
  const original = (raw || "").trim();
  let cleaned = original;
  if (/Institutional Policy Citation|POL-|GDL-/i.test(original)) {
    cleaned = cleaned.replace(/^Grounding Evidence:\s*/i, "");
    cleaned = cleaned.replace(/^Institutional Policy Citation:\s*/i, "");
    return {
      text: cleaned,
      badge: "Policy Citation",
      icon: Scale,
      borderClass: "border-l-indigo-500",
      badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
    };
  }
  if (/Deposit maturity|signal detected|portfolio drift|inflow|outflow|signal/i.test(original)) {
    cleaned = cleaned.replace(/^Grounding Evidence:\s*/i, "");
    return {
      text: cleaned,
      badge: "Client Signal",
      icon: Activity,
      borderClass: "border-l-emerald-500",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    };
  }
  if (/Fixed Deposit|Holding|h-c-|principal/i.test(original)) {
    cleaned = cleaned.replace(/^Grounding Evidence:\s*/i, "");
    return {
      text: cleaned,
      badge: "Holding Position",
      icon: Layers,
      borderClass: "border-l-purple-500",
      badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
    };
  }
  if (/Proposed Asset/i.test(original)) {
    cleaned = cleaned.replace(/^Proposed Asset:\s*/i, "");
    return {
      text: cleaned,
      badge: "Proposed Asset",
      icon: Sparkles,
      borderClass: "border-l-amber-500",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
    };
  }
  if (/Indicative Return|return|APY/i.test(original)) {
    cleaned = cleaned.replace(/^Indicative Return:\s*/i, "");
    return {
      text: cleaned,
      badge: "Indicative Return",
      icon: Percent,
      borderClass: "border-l-teal-500",
      badgeClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
    };
  }
  cleaned = cleaned.replace(/^Grounding Evidence:\s*/i, "");
  return {
    text: cleaned,
    badge: "Evidence Record",
    icon: FileCheck2,
    borderClass: "border-l-color-2",
    badgeClass: "bg-color-2/10 text-color-2 border-color-2/20"
  };
}
export const GroundingCitationsCard = ({
  citations = [],
  fallbackEvidence = [],
  pageSize = 3,
  isLoading = false
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const activeItems = React.useMemo(() => {
    if (isLoading) return [];
    if (citations.length > 0) return citations;
    if (fallbackEvidence.length > 0) {
      return fallbackEvidence.map((e) => {
        if (typeof e === "string") return e;
        return e.summary || e.description || e.text || (e.details ? `${e.type}: ${e.details}` : JSON.stringify(e));
      });
    }
    return [];
  }, [citations, fallbackEvidence, isLoading]);
  const totalItems = activeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  useEffect(() => {
    setCurrentPage(1);
  }, [citations.length, fallbackEvidence.length, isLoading]);
  const startIndex = (currentPage - 1) * pageSize;
  const currentItems = activeItems.slice(startIndex, startIndex + pageSize);
  const fromRecord = totalItems === 0 ? 0 : startIndex + 1;
  const toRecord = Math.min(startIndex + pageSize, totalItems);
  return <div className="bg-color-7 border border-color-5 rounded-radius-lg p-space-4 shadow-sm space-y-space-3">
      {
    /* Header */
  }
      <div className="flex items-center justify-between pb-2 border-b border-color-5">
        <h2 className="text-text-xs font-bold text-color-1 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-color-2" aria-hidden="true" />
          <span>Grounding Citations & Signals</span>
        </h2>
        {isLoading ? <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-color-2/10 text-color-2 border border-color-2/20 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-color-2 animate-ping" />
            Synthesizing Citations...
          </span> : totalItems > 0 ? <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-color-2/10 text-color-2 border border-color-2/20">
            {totalItems} total
          </span> : null}
      </div>

      {
    /* AI Synthesis Skeleton Loading State */
  }
      {isLoading ? <div className="space-y-2.5 py-1 animate-pulse">
          <div className="p-space-3 rounded-radius-md bg-color-6 border border-color-5/60 border-l-4 border-l-indigo-500 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                <Scale className="w-3 h-3" />
                Policy Citation
              </span>
              <span className="h-2 w-12 bg-color-5 rounded" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 bg-color-5 rounded w-4/5" />
              <div className="h-2 bg-color-5/70 rounded w-full" />
            </div>
          </div>

          <div className="p-space-3 rounded-radius-md bg-color-6 border border-color-5/60 border-l-4 border-l-emerald-500 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                <Activity className="w-3 h-3" />
                Client Signal
              </span>
              <span className="h-2 w-16 bg-color-5 rounded" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 bg-color-5 rounded w-3/4" />
              <div className="h-2 bg-color-5/70 rounded w-5/6" />
            </div>
          </div>

          <div className="p-space-3 rounded-radius-md bg-color-6 border border-color-5/60 border-l-4 border-l-purple-500 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                <Layers className="w-3 h-3" />
                Holding Position
              </span>
              <span className="h-2 w-10 bg-color-5 rounded" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 bg-color-5 rounded w-2/3" />
            </div>
          </div>

          <div className="pt-1.5 flex items-center justify-center gap-2 text-[11px] text-color-1/70 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-color-2 animate-spin" />
            <span>AI grounding signals with policy rulebook...</span>
          </div>
        </div> : currentItems.length > 0 ? <div className="space-y-2">
          {currentItems.map((rawCite, idx) => {
    const globalIdx = startIndex + idx + 1;
    const parsed = parseCitation(rawCite);
    const Icon = parsed.icon;
    return <div
      key={globalIdx}
      className={`p-2.5 rounded-radius-sm bg-color-6 border border-color-5 border-l-4 ${parsed.borderClass} space-y-1 transition-all hover:border-color-5/90 shadow-2xs`}
    >
                <div className="flex items-center justify-between gap-1 text-[10px]">
                  <span className="font-semibold text-color-1 flex items-center gap-1">
                    <Icon className="w-3 h-3 opacity-80" />
                    <span>#{globalIdx}</span>
                  </span>
                  <span className={`px-1.5 py-0.2 rounded border font-medium ${parsed.badgeClass}`}>
                    {parsed.badge}
                  </span>
                </div>
                <p className="text-[11px] text-color-1/85 leading-relaxed font-mono break-words">
                  {parsed.text}
                </p>
              </div>;
  })}
        </div> : <div className="p-4 text-center text-[11px] text-color-1/60 italic bg-color-6 rounded-radius-sm border border-dashed border-color-5">
          Citations will populate automatically when the draft is synthesized from client signals.
        </div>}

      {
    /* Pagination Footer */
  }
      {totalItems > pageSize && <div className="pt-2 border-t border-color-5 flex items-center justify-between text-[11px] text-color-1/70">
          <span className="font-medium text-[10px]">
            {fromRecord}–{toRecord} of {totalItems}
          </span>

          <div className="flex items-center gap-1">
            <button
    type="button"
    disabled={currentPage <= 1}
    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
    aria-label="Previous citations page"
    className="p-1 rounded bg-color-6 border border-color-5 text-color-1 hover:bg-color-5/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
  >
              <ChevronLeft className="w-3 h-3" />
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
    const p = i + 1;
    const isActive = p === currentPage;
    return <button
      key={p}
      type="button"
      onClick={() => setCurrentPage(p)}
      className={`min-w-[20px] h-5 px-1 text-[10px] font-medium rounded transition-colors ${isActive ? "bg-color-2 text-white font-bold" : "bg-color-6 border border-color-5 text-color-1/70 hover:bg-color-5/50"}`}
    >
                  {p}
                </button>;
  })}

            <button
    type="button"
    disabled={currentPage >= totalPages}
    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
    aria-label="Next citations page"
    className="p-1 rounded bg-color-6 border border-color-5 text-color-1 hover:bg-color-5/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
  >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>}
    </div>;
};
