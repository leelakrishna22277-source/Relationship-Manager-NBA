import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Users,
  DollarSign,
  Layers,
  Clock,
  TrendingUp,
  ArrowRight,
  BellRing
} from "lucide-react";
import { rmService } from "../../services/rmService";
import { clientService } from "../../services/clientService";
import { MetricCard } from "../../components/common/MetricCard";
import { StatusBadge } from "../../components/common/StatusBadge";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";
import { formatCurrency, formatPercent } from "../../utils/formatters";
import { useAuth } from "../auth/AuthContext";
export const RmDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["rm-dashboard", user?.id],
    queryFn: async () => {
      const res = await rmService.getDashboard();
      return res.data;
    }
  });
  const { data: clientsData } = useQuery({
    queryKey: ["rm-dashboard-top-clients", user?.id],
    queryFn: async () => {
      const res = await clientService.getClients({ page: 1, limit: 50 });
      return res.data || [];
    }
  });
  if (isLoading) {
    return <LoadingState message="Aggregating portfolio intelligence & holdings..." />;
  }
  if (isError) {
    return <ErrorState
      title="Failed to Load Portfolio Dashboard"
      message={error?.message || "Database connection error"}
      onRetry={refetch}
    />;
  }
  const stats = data || {
    assignedClientsCount: 0,
    totalAum: 0,
    activeNbasCount: 0,
    maturingDepositsCount: 0,
    pendingFollowupsCount: 0,
    actedOnRate: 0,
    recentNbas: [],
    recentSignals: []
  };
  const topClients = [...clientsData || []].sort((a, b) => Number(b.total_balance || 0) - Number(a.total_balance || 0)).slice(0, 5);
  return <div className="space-y-space-6 pb-space-8">
      {
    /* Page Header */
  }
      <div>
        <h1 className="text-text-xl sm:text-text-2xl font-bold text-color-1 font-heading">
          Portfolio Overview
        </h1>
        <p className="text-text-xs text-color-1/60 mt-0.5">
          Real-time summary of assigned client holdings, portfolio valuations, and relationship activities
        </p>
      </div>

      {
    /* KPI Cards Grid */
  }
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-4">
        <MetricCard
    title="Assigned Clients"
    value={stats.assignedClientsCount}
    subtitle="Direct relationship book"
    icon={Users}
    onClick={() => navigate("/rm/clients")}
  />
        <MetricCard
    title="Portfolio AUM"
    value={formatCurrency(stats.totalAum)}
    subtitle="Total assets under management"
    icon={DollarSign}
  />
        <MetricCard
    title="Portfolio Positions"
    value={stats.activeNbasCount > 0 ? `${stats.activeNbasCount} In Scope` : "All Active"}
    subtitle="Tracked client assets"
    icon={Layers}
    onClick={() => navigate("/rm/clients")}
  />
        <MetricCard
    title="Acted-On Rate"
    value={formatPercent(stats.actedOnRate)}
    subtitle="Actioned recommendations ratio"
    icon={TrendingUp}
  />
      </div>

      {
    /* Quick Action Alerts */
  }
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-4">
        <div className="p-space-4 rounded-radius-lg bg-color-7 border border-amber-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-space-3">
            <div className="p-2.5 rounded-radius-md bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-text-sm font-bold text-color-1">
                {stats.maturingDepositsCount} Maturing Fixed Deposits
              </span>
              <p className="text-[11px] text-color-1/60">Deposits reaching maturity within the next 30 days</p>
            </div>
          </div>
          <button
    type="button"
    onClick={() => navigate("/rm/clients")}
    className="text-text-xs text-color-2 hover:underline font-semibold flex items-center gap-1"
  >
            <span>Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-space-4 rounded-radius-lg bg-color-7 border border-blue-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-space-3">
            <div className="p-2.5 rounded-radius-md bg-blue-50 text-blue-700 border border-blue-200">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <span className="text-text-sm font-bold text-color-1">
                {stats.pendingFollowupsCount} Follow-ups Required
              </span>
              <p className="text-[11px] text-color-1/60">Client contacts requesting a callback or proposal</p>
            </div>
          </div>
          <button
    type="button"
    onClick={() => navigate("/rm/outcomes")}
    className="text-text-xs text-color-2 hover:underline font-semibold flex items-center gap-1"
  >
            <span>Track</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {
    /* Top Client Relationships by AUM (Roster Preview) */
  }
      <div className="w-full p-space-5 rounded-radius-lg bg-color-7 border border-color-5 shadow-sm space-y-space-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-text-sm font-bold text-color-1 font-heading flex items-center gap-2">
              <Users className="w-4 h-4 text-color-2" />
              <span>Top Client Relationships by AUM</span>
            </h2>
            <p className="text-[11px] text-color-1/60 mt-0.5">
              Direct relationship roster sorted by portfolio valuation
            </p>
          </div>
          <button
    type="button"
    onClick={() => navigate("/rm/clients")}
    className="text-text-xs text-color-2 hover:underline font-semibold flex items-center gap-1 self-start sm:self-auto"
  >
            <span>View All Clients</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-color-5/60">
          {topClients && topClients.length > 0 ? topClients.map((client) => <div
    key={client.id}
    onClick={() => navigate(`/rm/clients/${client.id}`)}
    className="py-space-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-color-6/50 p-2.5 rounded-radius-md transition-all group"
  >
                <div className="flex items-center gap-space-3">
                  <div className="w-10 h-10 rounded-full bg-color-6 border border-color-5 flex items-center justify-center text-color-2 font-bold text-text-sm group-hover:border-color-2 transition-colors">
                    {client.full_name?.charAt(0) || "C"}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-text-sm font-bold text-color-1 group-hover:text-color-2 transition-colors">
                        {client.full_name}
                      </span>
                      <span className="text-[10px] font-mono text-color-1/40">
                        {client.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={client.segment} />
                      <StatusBadge status={client.risk_profile} />
                      {client.holdings_count !== void 0 && <span className="text-[11px] text-color-1/50">
                          • {client.holdings_count} asset positions
                        </span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-space-4">
                  <div className="text-left sm:text-right">
                    <span className="text-text-sm font-bold text-color-1 font-mono block">
                      {formatCurrency(client.total_balance || 0)}
                    </span>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-color-1/50 block">
                      Portfolio Balance
                    </span>
                  </div>
                  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      navigate(`/rm/clients/${client.id}`);
    }}
    className="px-3 py-1.5 rounded-radius-md bg-color-6 hover:bg-color-2 hover:text-white text-color-1 text-text-xs font-semibold border border-color-5 group-hover:border-color-2 transition-all flex items-center gap-1 shrink-0"
  >
                    <span>View Client 360</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>) : <p className="text-[12px] text-color-1/50 py-space-4 text-center">
              No assigned clients found.
            </p>}
        </div>
      </div>
    </div>;
};
