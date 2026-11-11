import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CheckSquare,
  Filter,
  RefreshCw,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit2,
  ExternalLink
} from "lucide-react";
import { outcomeService } from "../../services/outcomeService";
import { PageHeader } from "../../components/layout/PageHeader";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";
import { EmptyState } from "../../components/common/EmptyState";
import { LogOutcomeModal } from "./LogOutcomeModal";
import { formatDate } from "../../utils/formatters";
const OUTCOME_TABS = [
  { label: "All Outcomes", value: "ALL" },
  { label: "Converted", value: "CONVERTED" },
  { label: "Interested", value: "INTERESTED" },
  { label: "Follow-up Req.", value: "FOLLOW_UP_REQUIRED" },
  { label: "Not Interested", value: "NOT_INTERESTED" },
  { label: "No Response", value: "NO_RESPONSE" }
];
import { useAuth } from "../auth/AuthContext";
export const RmOutcomeTrackingPage = () => {
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingOutcome, setEditingOutcome] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["rm-outcomes", user?.id, selectedFilter],
    queryFn: async () => {
      const res = await outcomeService.getRmOutcomes({
        outcome: selectedFilter === "ALL" ? void 0 : selectedFilter
      });
      return Array.isArray(res.data) ? res.data : [];
    }
  });
  const { data: allData } = useQuery({
    queryKey: ["rm-outcomes-all", user?.id],
    queryFn: async () => {
      const res = await outcomeService.getRmOutcomes();
      return Array.isArray(res.data) ? res.data : [];
    }
  });
  const outcomes = Array.isArray(data) ? data : [];
  const allOutcomes = Array.isArray(allData) && allData.length > 0 ? allData : outcomes;
  const filteredOutcomes = outcomes.filter((item) => {
    if (selectedFilter !== "ALL" && item.outcome !== selectedFilter) {
      return false;
    }
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const titleMatch = (item.nba?.title || "").toLowerCase().includes(term);
    const clientMatch = (item.nba?.client?.full_name || "").toLowerCase().includes(term);
    const notesMatch = (item.notes || "").toLowerCase().includes(term);
    return titleMatch || clientMatch || notesMatch;
  });
  const totalCount = allOutcomes.length;
  const convertedCount = allOutcomes.filter((o) => o.outcome === "CONVERTED").length;
  const interestedCount = allOutcomes.filter((o) => o.outcome === "INTERESTED").length;
  const followUpCount = allOutcomes.filter((o) => o.outcome === "FOLLOW_UP_REQUIRED").length;
  const conversionRate = totalCount > 0 ? Math.round(convertedCount / totalCount * 100) : 0;
  const renderOutcomeBadge = (outcome) => {
    switch (outcome) {
      case "CONVERTED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Converted
          </span>;
      case "INTERESTED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <TrendingUp className="w-3 h-3 text-blue-600" />
            Interested
          </span>;
      case "FOLLOW_UP_REQUIRED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Follow-up
          </span>;
      case "NOT_INTERESTED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Not Interested
          </span>;
      case "NO_RESPONSE":
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            No Response
          </span>;
    }
  };
  return <div className="space-y-space-6 max-w-7xl mx-auto">
      <PageHeader
    title="NBA Outcome History"
    subtitle="Chronological audit trail of finalized client decisions and investment recommendations"
    actions={<div className="flex items-center gap-2">
            <button
      type="button"
      onClick={() => refetch()}
      disabled={isFetching}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-radius-md text-text-xs font-semibold bg-color-6 border border-color-5 text-color-1/80 hover:text-color-1 hover:bg-color-5 transition-all shadow-sm"
    >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>}
  />

      {
    /* Action Success Alert */
  }
      {actionSuccess && <div className="p-space-3 rounded-radius-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>}

      {
    /* KPI Stats Strip */
  }
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-4">
        <div className="p-space-4 bg-color-7 border border-color-5 rounded-radius-lg shadow-sm">
          <p className="text-text-xs font-medium text-color-1/50">Total Logged</p>
          <p className="text-2xl font-bold text-color-1 mt-1">{totalCount}</p>
          <p className="text-[11px] text-color-1/40 mt-1">Recorded by your RM ID</p>
        </div>
        <div className="p-space-4 bg-color-7 border border-color-5 rounded-radius-lg shadow-sm">
          <p className="text-text-xs font-medium text-color-1/50">Converted Deals</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{convertedCount}</p>
          <p className="text-[11px] text-emerald-700/80 mt-1">{conversionRate}% conversion rate</p>
        </div>
        <div className="p-space-4 bg-color-7 border border-color-5 rounded-radius-lg shadow-sm">
          <p className="text-text-xs font-medium text-color-1/50">Interested Clients</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{interestedCount}</p>
          <p className="text-[11px] text-blue-700/80 mt-1">Nurturing pipeline</p>
        </div>
        <div className="p-space-4 bg-color-7 border border-color-5 rounded-radius-lg shadow-sm">
          <p className="text-text-xs font-medium text-color-1/50">Follow-ups Pending</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{followUpCount}</p>
          <p className="text-[11px] text-amber-700/80 mt-1">Action items scheduled</p>
        </div>
      </div>

      {
    /* Filter and Search Bar */
  }
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-space-3 bg-color-7 border border-color-5 rounded-radius-lg">
        {
    /* Filter Pills */
  }
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-color-1/40 ml-1 mr-1 shrink-0" />
          {OUTCOME_TABS.map((tab) => <button
    key={tab.value}
    type="button"
    onClick={() => setSelectedFilter(tab.value)}
    className={`px-3 py-1.5 rounded-radius-md text-text-xs font-semibold whitespace-nowrap transition-all ${selectedFilter === tab.value ? "bg-color-2 text-white shadow-sm" : "text-color-1/60 hover:text-color-1 hover:bg-color-6"}`}
  >
              {tab.label}
            </button>)}
        </div>

        {
    /* Quick Search */
  }
        <div className="w-full sm:w-64">
          <input
    type="text"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    placeholder="Search by client or product..."
    className="w-full px-3 py-1.5 bg-color-6 border border-color-5 rounded-radius-md text-text-xs text-color-1 placeholder-color-1/30 focus:outline-none focus:border-color-2 transition-colors"
  />
        </div>
      </div>

      {
    /* Main Content Area */
  }
      {isLoading ? <LoadingState message="Loading historical outcomes..." /> : isError ? <ErrorState
    title="Failed to Load Outcomes"
    message={error instanceof Error ? error.message : "Could not retrieve outcome audit history."}
    onRetry={() => refetch()}
  /> : filteredOutcomes.length === 0 ? <EmptyState
    icon={CheckSquare}
    title="No Outcomes Found"
    message={searchTerm ? `No recorded outcomes match "${searchTerm}".` : "No outcomes recorded under this filter yet."}
  /> : <div className="bg-color-7 border border-color-5 rounded-radius-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-color-5 bg-color-6/40 text-[11px] font-bold uppercase tracking-wider text-color-1/50">
                  <th className="py-3 px-4">Recorded Date</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Recommendation</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4">Follow-up Date</th>
                  <th className="py-3 px-4">Notes & Rationale</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-color-5 text-text-xs">
                {filteredOutcomes.map((item) => <tr key={item.id} className="hover:bg-color-6/30 transition-colors">
                    <td className="py-3.5 px-4 text-color-1/60 whitespace-nowrap">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-color-1">
                        {item.nba?.client?.full_name || "Assigned Client"}
                      </span>
                      {item.nba?.client?.segment && <span className="block text-[11px] text-color-1/40">
                          {item.nba.client.segment}
                        </span>}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-medium text-color-1 truncate">
                        {item.nba?.title || `NBA #${item.nba_id.slice(0, 8)}`}
                      </p>
                      {item.nba?.action_type && <p className="text-[11px] text-color-1/40 truncate">
                          Action: {item.nba.action_type}
                        </p>}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderOutcomeBadge(item.outcome)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.follow_up_date ? <span className="inline-flex items-center gap-1.5 text-amber-300 font-medium text-xs">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(item.follow_up_date)}
                        </span> : <span className="text-color-1/30">—</span>}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      {item.notes ? <p className="text-color-1/70 line-clamp-2 text-xs italic">
                          "{item.notes}"
                        </p> : <span className="text-color-1/30 italic">No notes provided</span>}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
    type="button"
    onClick={() => setEditingOutcome(item)}
    className="px-2.5 py-1 rounded bg-color-6 hover:bg-color-5 border border-color-5 text-color-1 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
    title="Edit outcome, notes, or follow-up schedule"
  >
                          <Edit2 className="w-3 h-3 text-color-2" />
                          <span>Edit</span>
                        </button>
                        <Link
    to={`/rm/nbas/${item.nba_id}/outreach`}
    className="px-2 py-1 rounded hover:bg-color-6 text-color-1/70 hover:text-color-1 text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
    title="Open in Outreach Composer"
  >
                          <ExternalLink className="w-3 h-3" />
                          <span>Outreach</span>
                        </Link>
                      </div>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>}



      {
    /* Outcome Editing Modal */
  }
      {editingOutcome && (() => {
    const modalNba = editingOutcome.nba ? editingOutcome.nba : {
      id: editingOutcome.nba_id,
      client_id: "",
      action_type: "DEPOSIT_ROLLOVER",
      title: "Recommendation",
      evidence: [],
      priority: "HIGH",
      status: "COMPLETED",
      generated_at: editingOutcome.created_at,
      created_at: editingOutcome.created_at
    };
    return <LogOutcomeModal
      isOpen={Boolean(editingOutcome)}
      onClose={() => setEditingOutcome(null)}
      onSuccess={(msg) => {
        setActionSuccess(msg || "Outcome updated successfully.");
        setEditingOutcome(null);
        setTimeout(() => setActionSuccess(null), 4e3);
      }}
      nba={modalNba}
      initialData={{
        outcome: editingOutcome.outcome,
        notes: editingOutcome.notes || "",
        follow_up_date: editingOutcome.follow_up_date ? new Date(editingOutcome.follow_up_date).toISOString().split("T")[0] : ""
      }}
    />;
  })()}
    </div>;
};
