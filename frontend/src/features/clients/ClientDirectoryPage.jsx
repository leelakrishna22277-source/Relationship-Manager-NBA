import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Users,
  ArrowRight,
  Compass,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Layers
} from "lucide-react";
import { clientService } from "../../services/clientService";
import { rmService } from "../../services/rmService";
import { useAuth } from "../auth/AuthContext";
import { formatCurrency } from "../../utils/formatters";
import { getInitials, getSegmentConfig, getRiskConfig } from "./clientUiHelpers";
export const ClientDirectoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("");
  const [riskTolerance, setRiskTolerance] = useState("");
  const [page, setPage] = useState(1);
  const { data: rmStatsData } = useQuery({
    queryKey: ["rm-dashboard-stats", user?.id],
    queryFn: async () => {
      const res = await rmService.getDashboard();
      return res.data;
    }
  });
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["clients-directory", user?.id, search, segment, riskTolerance, page],
    queryFn: async () => {
      return clientService.getClients({
        search: search.trim() || void 0,
        segment: segment || void 0,
        risk_tolerance: riskTolerance || void 0,
        risk_profile: riskTolerance || void 0,
        page,
        limit: 10
      });
    }
  });
  const clients = data?.data || [];
  const meta = data?.meta || { totalPages: 1, total: clients.length };
  const totalCount = meta.total ?? clients.length;
  const totalPages = Math.max(1, meta.totalPages ?? Math.ceil(totalCount / 10));
  const hasActiveFilters = Boolean(search.trim() || segment || riskTolerance);
  const handleResetFilters = () => {
    setSearch("");
    setSegment("");
    setRiskTolerance("");
    setPage(1);
  };
  return <div className="space-y-space-6 pb-space-8 max-w-7xl mx-auto">
      {
    /* Page Header */
  }
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-4 pb-space-4 border-b border-color-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-radius-md bg-color-4 text-color-2 border border-color-5">
              <Users className="w-5 h-5 text-color-2" />
            </div>
            <h1 className="text-text-xl sm:text-text-2xl font-bold text-color-1 font-heading">
              Client Directory
            </h1>
          </div>
          <p className="text-text-xs text-color-1/60 mt-1">
            Dedicated relationship roster: monitor portfolio AUM, risk tolerance distributions, and active recommendations.
          </p>
        </div>

        <button
    type="button"
    onClick={() => refetch()}
    disabled={isFetching}
    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-radius-md text-text-xs font-semibold bg-color-6 border border-color-5 text-color-1/80 hover:text-color-1 hover:bg-color-5 transition-all shadow-sm shrink-0 self-start sm:self-auto"
  >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          <span>Refresh Roster</span>
        </button>
      </div>

      {
    /* RM Portfolio KPI Strip */
  }
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-4">
        <div className="p-space-4 rounded-radius-lg bg-color-7 border border-color-5 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-radius-md bg-blue-50 text-color-2 border border-blue-200">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-color-1/50 uppercase tracking-wider block">
              Assigned Roster
            </span>
            <span className="text-text-lg font-bold text-color-1">
              {rmStatsData?.assignedClientsCount ?? totalCount} Accounts
            </span>
          </div>
        </div>

        <div className="p-space-4 rounded-radius-lg bg-color-7 border border-color-5 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-radius-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-color-1/50 uppercase tracking-wider block">
              Managed Portfolio AUM
            </span>
            <span className="text-text-lg font-bold text-color-1">
              {formatCurrency(rmStatsData?.totalAum ?? 6825e4)}
            </span>
          </div>
        </div>

        <div className="p-space-4 rounded-radius-lg bg-color-7 border border-color-5 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-radius-md bg-amber-50 text-amber-700 border border-amber-200">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-color-1/50 uppercase tracking-wider block">
              Active Opportunities
            </span>
            <span className="text-text-lg font-bold text-color-1">
              {rmStatsData?.activeNbasCount ?? 15} Next-Best-Actions
            </span>
          </div>
        </div>
      </div>

      {
    /* Interactive Search & Filter Toolbar */
  }
      <div className="p-space-4 rounded-radius-lg bg-color-7 border border-color-5 shadow-sm space-y-space-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-3">
          {
    /* Search Input */
  }
          <div className="relative grow max-w-lg">
            <Search className="w-4 h-4 text-color-1/40 absolute left-3 top-2.5" />
            <input
    type="text"
    value={search}
    onChange={(e) => {
      setSearch(e.target.value);
      setPage(1);
    }}
    placeholder="Search clients by name, account ID, or email..."
    className="w-full bg-color-6 border border-color-5 rounded-radius-md pl-9 pr-8 py-2 text-text-xs text-color-1 placeholder-color-1/40 focus:outline-none focus:border-color-2 transition-colors"
  />
            {search && <button
    type="button"
    onClick={() => {
      setSearch("");
      setPage(1);
    }}
    className="absolute right-2.5 top-2.5 text-color-1/40 hover:text-color-1"
    aria-label="Clear search"
  >
                <X className="w-3.5 h-3.5" />
              </button>}
          </div>

          {
    /* Filter Selects */
  }
          <div className="flex flex-wrap items-center gap-space-2.5">
            <div className="flex items-center gap-1.5 text-color-1/50 text-text-xs font-semibold">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            <select
    value={segment}
    onChange={(e) => {
      setSegment(e.target.value);
      setPage(1);
    }}
    aria-label="Filter by Segment"
    className="bg-color-6 border border-color-5 rounded-radius-md px-3 py-1.5 text-text-xs font-medium text-color-1 focus:outline-none focus:border-color-2 cursor-pointer shadow-2xs"
  >
              <option value="">All Segments</option>
              <option value="HNI">HNI</option>
              <option value="WEALTH">Wealth</option>
              <option value="PREMIER">Premier</option>
              <option value="RETAIL">Retail</option>
            </select>

            <select
    value={riskTolerance}
    onChange={(e) => {
      setRiskTolerance(e.target.value);
      setPage(1);
    }}
    aria-label="Filter by Risk Tolerance"
    className="bg-color-6 border border-color-5 rounded-radius-md px-3 py-1.5 text-text-xs font-medium text-color-1 focus:outline-none focus:border-color-2 cursor-pointer shadow-2xs"
  >
              <option value="">All Risk Tolerances</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Moderate</option>
              <option value="HIGH">High</option>
            </select>

            {hasActiveFilters && <button
    type="button"
    onClick={handleResetFilters}
    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-radius-md text-text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
  >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </button>}
          </div>
        </div>
      </div>

      {
    /* Client Roster Table Card */
  }
      <div className="bg-color-7 border border-color-5 rounded-radius-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-color-5 bg-color-6/70 text-[11px] font-bold uppercase tracking-wider text-color-1/60">
                <th className="py-3.5 px-5">Client Profile</th>
                <th className="py-3.5 px-4">Wealth Segment</th>
                <th className="py-3.5 px-4">Risk Tolerance</th>
                <th className="py-3.5 px-4">Portfolio Balance / AUM</th>
                <th className="py-3.5 px-4">Holdings & Products</th>
                <th className="py-3.5 px-5 text-right">Portfolio Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-color-5/70 text-text-xs">
              {isLoading ? <tr>
                  <td colSpan={6} className="py-12 text-center text-color-1/40">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-color-2" />
                      <span>Loading relationship roster...</span>
                    </div>
                  </td>
                </tr> : isError ? <tr>
                  <td colSpan={6} className="py-10 text-center text-rose-600">
                    <span>Failed to retrieve client roster: {error?.message || "Network error"}</span>
                  </td>
                </tr> : clients.length === 0 ? <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="font-semibold text-color-1">No matching clients found</p>
                      <p className="text-color-1/50 text-[11px]">
                        Try refining your search terms or clearing current filter selections.
                      </p>
                      {hasActiveFilters && <button
    type="button"
    onClick={handleResetFilters}
    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-radius-md bg-color-2 text-white text-text-xs font-semibold shadow-xs"
  >
                          Clear Filters
                        </button>}
                    </div>
                  </td>
                </tr> : clients.map((client) => {
    const segConfig = getSegmentConfig(client.segment);
    const riskConfig = getRiskConfig(client.risk_profile);
    const holdingsCount = client.holdings_count ?? 1;
    return <tr
      key={client.id}
      onClick={() => navigate(`/rm/clients/${client.id}`)}
      className="group hover:bg-color-4/30 cursor-pointer transition-colors"
    >
                      {
      /* Client Profile */
    }
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div
      className={`w-9 h-9 rounded-full bg-gradient-to-br ${segConfig.avatarGradient} flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-white shadow-2xs`}
    >
                            {getInitials(client.full_name)}
                          </div>
                          <div>
                            <span className="font-bold text-color-1 text-text-xs group-hover:text-color-2 transition-colors block">
                              {client.full_name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-color-1/50 font-mono mt-0.5">
                              <span>ID: {client.id}</span>
                              <span>•</span>
                              <span>{holdingsCount} {holdingsCount === 1 ? "Holding" : "Holdings"}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {
      /* Wealth Segment */
    }
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] border ${segConfig.badge}`}>
                          {client.segment}
                        </span>
                      </td>

                      {
      /* Risk Tolerance */
    }
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${riskConfig.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${riskConfig.dot}`} />
                          <span>{riskConfig.label}</span>
                        </span>
                      </td>

                      {
      /* Portfolio Balance / AUM */
    }
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-text-xs text-color-1 block">
                          {formatCurrency(client.total_balance || 0)}
                        </span>
                        <span className="text-[10px] text-color-1/40 font-mono block">
                          Portfolio Valuation
                        </span>
                      </td>

                      {
      /* Holdings & Products */
    }
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-color-6 border border-color-5 text-color-1 text-[11px] font-medium">
                          <Layers className="w-3.5 h-3.5 text-color-2" />
                          <span className="font-bold">{holdingsCount}</span>
                          <span>{holdingsCount === 1 ? "Position" : "Positions"}</span>
                        </span>
                      </td>

                      {
      /* Actions */
    }
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/rm/clients/${client.id}`);
      }}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-radius-md bg-color-6 hover:bg-color-2 hover:text-white border border-color-5 text-color-2 text-text-xs font-semibold transition-all shadow-2xs group-hover:border-color-2"
    >
                          <span>View Client 360</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </td>
                    </tr>;
  })}
            </tbody>
          </table>
        </div>

        {
    /* Enhanced Pagination Controls */
  }
        <div className="p-space-4 border-t border-color-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-text-xs text-color-1/60 bg-color-6/30">
          <div>
            Showing <span className="font-semibold text-color-1">{(page - 1) * 10 + 1}</span> to{" "}
            <span className="font-semibold text-color-1">{Math.min(page * 10, totalCount)}</span> of{" "}
            <span className="font-semibold text-color-1">{totalCount}</span> accounts
          </div>

          <div className="flex items-center gap-1.5">
            <button
    type="button"
    onClick={() => setPage((p) => Math.max(1, p - 1))}
    disabled={page <= 1}
    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-radius-md border border-color-5 bg-color-6 hover:bg-color-5 text-color-1 disabled:opacity-40 transition-colors"
  >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => <button
    key={p}
    type="button"
    onClick={() => setPage(p)}
    className={`w-7 h-7 rounded-radius-md text-text-xs font-semibold transition-colors ${page === p ? "bg-color-2 text-white shadow-xs" : "bg-color-6 border border-color-5 text-color-1 hover:bg-color-5"}`}
  >
                {p}
              </button>)}

            <button
    type="button"
    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
    disabled={page >= totalPages}
    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-radius-md border border-color-5 bg-color-6 hover:bg-color-5 text-color-1 disabled:opacity-40 transition-colors"
  >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>;
};
