import { useQuery } from "@tanstack/react-query";
import {
  Users,
  TrendingUp,
  Award,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart2,
  CheckSquare,
  ArrowRight
} from "lucide-react";
import { teamLeadService } from "../../services/teamLeadService";
import { PageHeader } from "../../components/layout/PageHeader";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";
import { MetricCard } from "../../components/common/MetricCard";
import { formatPercent } from "../../utils/formatters";
import { ClientAllocationTable } from "./ClientAllocationTable";
export const TeamLeadDashboardPage = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["team-lead-dashboard"],
    queryFn: async () => {
      const res = await teamLeadService.getDashboard();
      return res.data;
    }
  });
  const { data: rmsList } = useQuery({
    queryKey: ["team-rms"],
    queryFn: async () => {
      const res = await teamLeadService.getTeamRms();
      return res.data || [];
    }
  });
  const availableRms = rmsList || [
    { id: "rm-1", name: "Rajesh Kumar", email: "rm.rajesh@bank.com", role: "RM" },
    { id: "rm-2", name: "Priya Verma", email: "rm.priya@bank.com", role: "RM" }
  ];
  if (isLoading) {
    return <LoadingState message="Loading supervisory team intelligence..." />;
  }
  if (isError || !data) {
    return <ErrorState
      title="Supervisory Dashboard Unavailable"
      message={error instanceof Error ? error.message : "Failed to retrieve team-level analytics."}
      onRetry={() => refetch()}
    />;
  }
  const {
    teamName = "North Zone Wealth Advisory",
    totalRms = 2,
    totalClients = 46,
    assignedClients = 46,
    unassignedClients = 0,
    teamActedOnRate = 0.81,
    outcomesBreakdown = {},
    rmPerformance = []
  } = data || {};
  const totalOutcomesCount = Object.values(outcomesBreakdown || {}).reduce((acc, v) => acc + v, 0);
  return <div className="space-y-space-6 max-w-7xl mx-auto">
      <PageHeader
    title={`${teamName} \u2014 Supervisor Command Center`}
    subtitle="Aggregate portfolio oversight, RM operational velocity, and client capacity allocation"
    actions={<div className="flex items-center gap-3">
            <a
      href="/team-lead/outcomes"
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-radius-md bg-color-2 hover:bg-color-3 text-white text-text-xs font-semibold shadow-sm transition-all"
    >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Team Outcomes</span>
            </a>
            <button
      type="button"
      onClick={() => refetch()}
      disabled={isFetching}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-radius-md text-text-xs font-semibold bg-color-6 border border-color-5 text-color-1/80 hover:text-color-1 hover:bg-color-5 transition-all shadow-sm"
    >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh Data
            </button>
          </div>}
  />

      {
    /* KPI Cards Strip */
  }
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-4">
        <MetricCard
    title="Total Managed Clients"
    value={String(totalClients)}
    subtitle="All 46 Clients Fully Assigned"
    icon={Award}
  />
        <MetricCard
    title="Active Relationship Managers"
    value={String(totalRms)}
    subtitle="2 RMs (23 Clients Each)"
    icon={Users}
  />
        <MetricCard
    title="Team Acted-On Rate"
    value={formatPercent(teamActedOnRate)}
    subtitle="Target: ≥75% adoption velocity"
    icon={TrendingUp}
    trend={{ value: `${Math.round(teamActedOnRate * 100)}%`, isPositive: teamActedOnRate >= 0.75 }}
  />
      </div>

      {
    /* Aggregate Outcomes Distribution */
  }
      <div className="w-full bg-color-7 border border-color-5 rounded-radius-lg p-space-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-space-4">
          <div>
            <h2 className="text-text-base font-bold text-color-1 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-color-2" />
              Aggregated Recommendation Outcomes
            </h2>
            <p className="text-text-xs text-color-1/50">
              Conversion distribution across all logged RM interactions ({totalOutcomesCount} total)
            </p>
          </div>
          <a
    href="/team-lead/outcomes"
    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-radius-md bg-color-6 hover:bg-color-5 border border-color-5 text-color-2 text-text-xs font-semibold shadow-xs transition-colors shrink-0"
  >
            <span>View Outcomes Audit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="space-y-3 mt-4 text-text-xs">
          {[
    {
      label: "Converted / Rollover Booked",
      key: "CONVERTED",
      icon: CheckCircle2,
      iconClass: "text-emerald-600 dark:text-emerald-400",
      textClass: "text-emerald-600 dark:text-emerald-400",
      barClass: "bg-emerald-500"
    },
    {
      label: "Client Interested",
      key: "INTERESTED",
      icon: TrendingUp,
      iconClass: "text-purple-600 dark:text-purple-400",
      textClass: "text-purple-600 dark:text-purple-400",
      barClass: "bg-purple-600"
    },
    {
      label: "Follow-up Required",
      key: "FOLLOW_UP_REQUIRED",
      icon: Clock,
      iconClass: "text-amber-600 dark:text-amber-400",
      textClass: "text-amber-600 dark:text-amber-400",
      barClass: "bg-amber-500"
    },
    {
      label: "Not Interested",
      key: "NOT_INTERESTED",
      icon: AlertCircle,
      iconClass: "text-slate-600 dark:text-slate-400",
      textClass: "text-slate-600 dark:text-slate-400",
      barClass: "bg-slate-500"
    },
    {
      label: "No Response",
      key: "NO_RESPONSE",
      icon: AlertCircle,
      iconClass: "text-rose-600 dark:text-rose-400",
      textClass: "text-rose-600 dark:text-rose-400",
      barClass: "bg-rose-500"
    }
  ].map(({ label, key, icon: Icon, iconClass, textClass, barClass }) => {
    const count = outcomesBreakdown[key] || 0;
    const pct = totalOutcomesCount > 0 ? Math.round(count / totalOutcomesCount * 100) : 0;
    return <div key={key}>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-color-1 flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${iconClass}`} />
                    {label}
                  </span>
                  <span className={`font-bold ${textClass}`}>{count} ({pct}%)</span>
                </div>
                <div className="w-full bg-color-6 h-2 rounded-full overflow-hidden">
                  <div className={`${barClass} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
              </div>;
  })}
        </div>
      </div>

      {
    /* RM Performance Leaderboard */
  }
      <div className="bg-color-7 border border-color-5 rounded-radius-lg overflow-hidden shadow-sm">
        <div className="p-space-5 border-b border-color-5">
          <h2 className="text-text-base font-bold text-color-1">Advisory Team Velocity Leaderboard</h2>
          <p className="text-text-xs text-color-1/50">Each RM currently manages 23 assigned accounts</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-color-5 bg-color-6/40 text-[11px] font-bold uppercase tracking-wider text-color-1/50">
                <th className="py-3 px-4">Relationship Manager</th>
                <th className="py-3 px-4">Assigned Clients</th>
                <th className="py-3 px-4">RM State</th>
                <th className="py-3 px-4">Action Velocity</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-color-5 text-text-xs">
              {(rmPerformance || []).map((rm) => <tr key={rm.rmId} className="hover:bg-color-6/30 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-color-1">
                    {rm.rmName}
                    <span className="block text-[11px] font-normal text-color-1/40">ID: {rm.rmId}</span>
                  </td>
                  <td className="py-3.5 px-4 text-color-1/80 font-medium">{rm.clientsCount} Clients</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Active
                    </span>
                  </td>
                  <td className="py-3.5 px-4 min-w-[140px]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-color-1">{Math.round(rm.actedOnRate * 100)}%</span>
                    </div>
                    <div className="w-full bg-color-6 h-1.5 rounded-full overflow-hidden">
                      <div
    className={`h-1.5 rounded-full ${rm.actedOnRate >= 0.75 ? "bg-emerald-600" : "bg-amber-600"}`}
    style={{ width: `${Math.min(100, Math.round(rm.actedOnRate * 100))}%` }}
  />
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-emerald-700 font-semibold text-xs">On Track</span>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {
    /* Embedded Client Portfolio Coverage & RM Allocation Table */
  }
      <ClientAllocationTable
    availableRms={availableRms}
    onAllocationChanged={() => refetch()}
  />
    </div>;
};
