import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckSquare,
  Filter,
  RefreshCw,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Clock,
  AlertCircle,
  XCircle,
  User
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { teamLeadService } from "../../services/teamLeadService";
import { PageHeader } from "../../components/layout/PageHeader";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";
import { EmptyState } from "../../components/common/EmptyState";
import { formatDate } from "../../utils/formatters";
const OUTCOME_FILTERS = [
  { id: "filter-all", label: "All Team Outcomes", value: "ALL" },
  { id: "filter-converted", label: "Converted", value: "CONVERTED" },
  { id: "filter-interested", label: "Interested", value: "INTERESTED" },
  { id: "filter-followup", label: "Follow-up Req.", value: "FOLLOW_UP_REQUIRED" },
  { id: "filter-not-interested", label: "Not Interested", value: "NOT_INTERESTED" },
  { id: "filter-no-response", label: "No Response", value: "NO_RESPONSE" }
];
export const TeamOutcomeTrackingPage = () => {
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["team-lead-outcomes", user?.id, selectedFilter],
    queryFn: async () => {
      const res = await teamLeadService.getTeamOutcomes({
        outcome: selectedFilter === "ALL" ? void 0 : selectedFilter
      });
      return Array.isArray(res?.data) ? res.data : [];
    }
  });
  const { data: allData, refetch: refetchAll } = useQuery({
    queryKey: ["team-lead-outcomes-all", user?.id],
    queryFn: async () => {
      const res = await teamLeadService.getTeamOutcomes();
      return Array.isArray(res?.data) ? res.data : [];
    }
  });
  const outcomes = Array.isArray(data) ? data : [];
  const allList = Array.isArray(allData) ? allData : outcomes;
  const getTabCount = (filterVal) => {
    if (filterVal === "ALL") return allList.length;
    return allList.filter((item) => item.outcome === filterVal).length;
  };
  const filtered = outcomes.filter((item) => {
    if (selectedFilter !== "ALL" && item.outcome !== selectedFilter) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (item.nba?.title || "").toLowerCase().includes(q);
    const rmMatch = String(item.rm?.name || item.recorded_by_rm_id || item.rm_id || "").toLowerCase().includes(q);
    const clientMatch = (item.nba?.client?.full_name || "").toLowerCase().includes(q);
    const notesMatch = (item.notes || "").toLowerCase().includes(q);
    return titleMatch || rmMatch || clientMatch || notesMatch;
  });
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
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <XCircle className="w-3 h-3 text-slate-500" />
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
  const handleRefresh = () => {
    refetch();
    refetchAll();
  };
  return <div className="space-y-space-6 max-w-7xl mx-auto">
      <PageHeader
    title="Team Outcomes Audit"
    subtitle="Supervisory overview of all recorded client outcomes across your Relationship Manager team"
    actions={<div className="flex items-center gap-3">
            <button
      id="refresh-team-outcomes"
      type="button"
      onClick={handleRefresh}
      disabled={isFetching}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-radius-md text-text-xs font-semibold bg-color-6 border border-color-5 text-color-1/80 hover:text-color-1 hover:bg-color-5 transition-all shadow-sm"
    >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>}
  />

      {
    /* Filter and Search Controls */
  }
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-space-3 bg-color-7 border border-color-5 rounded-radius-lg">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-color-1/40 ml-1 mr-1 shrink-0" />
          {OUTCOME_FILTERS.map((tab) => {
    const count = getTabCount(tab.value);
    const isSelected = selectedFilter === tab.value;
    return <button
      key={tab.value}
      id={tab.id}
      type="button"
      onClick={() => setSelectedFilter(tab.value)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-radius-md text-text-xs font-semibold whitespace-nowrap transition-all ${isSelected ? "bg-color-2 text-white shadow-sm" : "text-color-1/60 hover:text-color-1 hover:bg-color-6"}`}
    >
                <span>{tab.label}</span>
                <span
      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? "bg-white/20 text-white" : "bg-color-6 text-color-1/60 border border-color-5/60"}`}
    >
                  {count}
                </span>
              </button>;
  })}
        </div>

        <div className="w-full sm:w-64">
          <input
    id="search-team-outcomes"
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search by client, RM, or recommendation..."
    className="w-full px-3 py-1.5 bg-color-6 border border-color-5 rounded-radius-md text-text-xs text-color-1 placeholder-color-1/30 focus:outline-none focus:border-color-2 transition-colors"
  />
        </div>
      </div>

      {
    /* Main Table */
  }
      {isLoading ? <LoadingState message="Loading team outcomes log..." /> : isError ? <ErrorState
    title="Failed to Load Team Outcomes"
    message={error instanceof Error ? error.message : "Could not retrieve team outcome records."}
    onRetry={handleRefresh}
  /> : filtered.length === 0 ? <EmptyState
    icon={CheckSquare}
    title="No Outcome Records"
    message={searchQuery ? `No team outcomes match "${searchQuery}".` : "No outcomes recorded under this filter."}
  /> : <div className="bg-color-7 border border-color-5 rounded-radius-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-color-5 bg-color-6/40 text-[11px] font-bold uppercase tracking-wider text-color-1/50">
                  <th className="py-3 px-4">Recorded Date</th>
                  <th className="py-3 px-4">Relationship Manager</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Product Recommendation</th>
                  <th className="py-3 px-4">Logged Outcome</th>
                  <th className="py-3 px-4">Follow-up Date</th>
                  <th className="py-3 px-4">Supervisory Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-color-5 text-text-xs">
                {filtered.map((item, idx) => {
    const rmIdStr = String(item.recorded_by_rm_id || item.rm_id || item.rmId || "rm-1");
    const rmName = item.rm?.name || `RM #${rmIdStr.slice(-6)}`;
    const nbaIdStr = String(item.nba_id || item.nbaId || item.nba?.id || "");
    const nbaTitle = item.nba?.title || (nbaIdStr ? `NBA #${nbaIdStr.slice(0, 8)}` : "NBA Recommendation");
    const clientName = item.nba?.client?.full_name || "Client";
    return <tr key={item.id || `out-${idx}`} className="hover:bg-color-6/30 transition-colors">
                      <td className="py-3.5 px-4 text-color-1/60 whitespace-nowrap">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-color-2" />
                          <span className="font-semibold text-color-1">
                            {rmName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-color-1">
                          {clientName}
                        </span>
                        {item.nba?.client?.segment && <span className="block text-[10px] text-color-1/50 uppercase font-mono">
                            {item.nba.client.segment}
                          </span>}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-medium text-color-1 truncate">
                          {nbaTitle}
                        </p>
                        {item.nba?.action_type && <p className="text-[11px] text-color-1/40 truncate">
                            Action: {item.nba.action_type}
                          </p>}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderOutcomeBadge(item.outcome)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.follow_up_date ? <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium text-xs">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(item.follow_up_date)}
                          </span> : <span className="text-color-1/30">—</span>}
                      </td>
                      <td className="py-3.5 px-4 max-w-sm">
                        {item.notes ? <p className="text-color-1/70 line-clamp-2 text-xs italic">
                            "{item.notes}"
                          </p> : <span className="text-color-1/30 italic">No notes</span>}
                      </td>
                    </tr>;
  })}
              </tbody>
            </table>
          </div>
        </div>}
    </div>;
};
