import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  DollarSign,
  Sparkles,
  Compass,
  ArrowRight,
  Loader2
} from "lucide-react";
import { clientService } from "../../services/clientService";
import { Tabs } from "../../components/common/Tabs";
import { StatusBadge } from "../../components/common/StatusBadge";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";
import { EmptyState } from "../../components/common/EmptyState";
import { formatCurrency, formatDate } from "../../utils/formatters";
function getHoldingAccountNumber(holding) {
  if (holding.account_number) return holding.account_number;
  return `ACC-${(holding.id || "0000").slice(-4).toUpperCase()}`;
}
function getHoldingStartDate(holding) {
  if (holding.start_date) return formatDate(holding.start_date);
  if (holding.created_at) return formatDate(holding.created_at);
  return "N/A";
}
function getHoldingRate(holding) {
  const bps = holding.interest_rate_bps ?? holding.product?.expected_return_bps;
  if (typeof bps === "number" && bps > 0) {
    return `${(bps / 100).toFixed(2)}% p.a.`;
  }
  if (holding.interest_rate) return holding.interest_rate;
  return "N/A";
}
function getHoldingRiskBadge(risk) {
  const r = (risk || "LOW").toUpperCase();
  if (r === "HIGH" || r.includes("HIGH") || r === "AGGRESSIVE") {
    return {
      label: "HIGH RISK",
      className: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40"
    };
  }
  if (r === "MEDIUM" || r.includes("MED") || r.includes("MOD") || r === "MODERATE") {
    return {
      label: "MEDIUM RISK",
      className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40"
    };
  }
  return {
    label: "LOW RISK",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40"
  };
}
export const Client360Page = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("holdings");
  const [aiSummary, setAiSummary] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isGeneratingLoading, setIsGeneratingLoading] = useState(false);
  const {
    data: clientData,
    isLoading: isClientLoading,
    isError: isClientError,
    error: clientError,
    refetch: refetchClient
  } = useQuery({
    queryKey: ["client-360-profile", id],
    queryFn: async () => {
      if (!id) throw new Error("Missing Client ID");
      const res = await clientService.getClientById(id);
      return res.data;
    },
    enabled: Boolean(id)
  });
  const { data: holdingsData, isLoading: isHoldingsLoading } = useQuery({
    queryKey: ["client-360-holdings", id],
    queryFn: async () => {
      if (!id) return [];
      const res = await clientService.getClientHoldings(id);
      return res.data || [];
    },
    enabled: Boolean(id)
  });
  const { data: signalsData, isLoading: isSignalsLoading } = useQuery({
    queryKey: ["client-360-signals", id],
    queryFn: async () => {
      if (!id) return [];
      const res = await clientService.getClientSignals(id);
      return res.data || [];
    },
    enabled: Boolean(id)
  });
  const { data: nbasData, isLoading: isNbasLoading } = useQuery({
    queryKey: ["client-360-nbas", id],
    queryFn: async () => {
      if (!id) return [];
      const res = await clientService.getClientNbas(id);
      return res.data || [];
    },
    enabled: Boolean(id)
  });
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing Client ID");
      return clientService.generateNbas(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-360-nbas", id] });
      queryClient.invalidateQueries({ queryKey: ["client-360-signals", id] });
      queryClient.invalidateQueries({ queryKey: ["nba-queue"] });
      setIsGeneratingLoading(false);
      setHasGenerated(true);
      setActiveTab("nbas");
      setAiSummary("Fresh AI recommendations generated and validated against suitability guidelines.");
      setTimeout(() => setAiSummary(null), 5e3);
    },
    onError: () => {
      setIsGeneratingLoading(false);
    }
  });
  const handleGenerate = () => {
    if (isGeneratingLoading || generateMutation.isPending) return;
    setIsGeneratingLoading(true);
    generateMutation.mutate();
  };
  if (isClientLoading) {
    return <LoadingState message="Consolidating Client 360 portfolio view..." />;
  }
  if (isClientError) {
    return <ErrorState
      title="Failed to Load Client 360 View"
      message={clientError?.message || "Access restricted to assigned RM"}
      onRetry={refetchClient}
    />;
  }
  const client = clientData;
  const holdings = Array.isArray(holdingsData) ? holdingsData : [];
  const signals = Array.isArray(signalsData) ? signalsData : [];
  const nbas = Array.isArray(nbasData) ? nbasData : [];
  const totalAum = holdings.reduce((sum, h) => sum + Number(h.balance ?? h.value ?? 0), 0) || client?.total_balance || 0;
  const tabs = [
    { id: "holdings", label: "Holdings & Products", count: holdings.length, icon: DollarSign },
    {
      id: "nbas",
      label: hasGenerated ? "Next-Best-Actions" : "Next-Best-Actions (Pending Generation)",
      count: hasGenerated ? nbas.length : 0,
      icon: Compass
    }
  ];
  return <div className="space-y-space-6 pb-space-12">
      {
    /* Back Link */
  }
      <div>
        <Link
    to="/rm/clients"
    className="inline-flex items-center gap-space-2 text-text-xs font-semibold text-color-2 hover:underline"
  >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Client Directory</span>
        </Link>
      </div>

      {
    /* Client Header Card */
  }
      <div className="p-space-6 rounded-radius-lg bg-color-7 border border-color-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-5">
        <div className="space-y-space-2">
          <div className="flex items-center gap-space-3">
            <div className="w-12 h-12 rounded-full bg-color-6 border border-color-5 flex items-center justify-center text-color-2 font-bold text-text-lg">
              {client?.full_name?.charAt(0) || "C"}
            </div>
            <div>
              <h1 className="text-text-xl sm:text-text-2xl font-bold text-color-1 font-heading">
                {client?.full_name}
              </h1>
              <span className="text-[11px] font-mono text-color-1/40">Client UUID: {client?.id}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-space-2 pt-1">
            <StatusBadge status={client?.segment || "PREMIER"} />
            <StatusBadge status={client?.risk_profile || "MODERATE"} />
            <span className="text-[11px] text-color-1/50 px-2 py-0.5 rounded bg-color-6 border border-color-5">
              Client since {formatDate(client?.client_since || client?.created_at)}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40">
              KYC: {client?.kyc_status || "VERIFIED"}
            </span>
          </div>
        </div>

        {
    /* Total AUM + Action */
  }
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-4 pt-space-4 lg:pt-0 border-t lg:border-t-0 border-color-5">
          <div className="text-left lg:text-right">
            <span className="text-[11px] font-semibold text-color-1/50 uppercase tracking-wider block">
              Total Portfolio AUM
            </span>
            <span className="text-text-2xl font-bold text-color-1 font-heading">
              {formatCurrency(totalAum)}
            </span>
          </div>

          <button
    type="button"
    disabled={isGeneratingLoading || generateMutation.isPending}
    onClick={handleGenerate}
    className="flex items-center gap-space-2 px-space-4 py-space-2.5 rounded-radius-md bg-color-2 hover:bg-color-3 text-white text-text-xs font-semibold shadow-sm transition-all disabled:opacity-50 shrink-0"
  >
            {isGeneratingLoading ? <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </> : <>
                <Sparkles className="w-4 h-4" />
                <span>{hasGenerated ? "Regenerate Recommendations" : "Generate Recommendations"}</span>
              </>}
          </button>
        </div>
      </div>

      {
    /* In-Flight Analysis Indicator */
  }
      {isGeneratingLoading && <div className="p-space-5 rounded-radius-lg bg-color-7 border border-color-5 shadow-xs flex items-center justify-center gap-3 text-color-1">
          <Loader2 className="w-5 h-5 text-color-2 animate-spin" />
          <span className="text-text-sm font-medium">Analyzing client portfolio & holdings...</span>
        </div>}

      {
    /* AI Notification Alert */
  }
      {aiSummary && <div className="p-space-3 rounded-radius-md bg-blue-50 border border-blue-200 text-blue-900 text-text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0 text-blue-700" />
          <span>{aiSummary}</span>
        </div>}

      {
    /* Tab Navigator */
  }
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {
    /* Tab 1: Holdings */
  }
      {activeTab === "holdings" && <div className="space-y-space-4">
          {isHoldingsLoading ? <LoadingState message="Loading client asset holdings..." /> : holdings.length === 0 ? <EmptyState title="No Holdings on File" message="This client has no recorded product holdings." /> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-4">
              {holdings.map((h) => {
    const risk = getHoldingRiskBadge(h.product?.risk_rating || h.risk_rating);
    const accNum = getHoldingAccountNumber(h);
    const startDate = getHoldingStartDate(h);
    const rate = getHoldingRate(h);
    const category = (h.product?.category || h.asset_type || "FIXED_INCOME").replace(/_/g, " ");
    return <div
      key={h.id}
      className="p-space-5 rounded-radius-lg bg-color-7 border border-color-5 shadow-sm space-y-space-3 transition-all hover:border-color-5/90"
    >
                    {
      /* Header: Product Name + Risk Badge */
    }
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-text-base font-bold text-color-1 font-heading leading-snug">
                        {h.product?.name || h.name || "Fixed Deposit"}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border shrink-0 ${risk.className}`}>
                        {risk.label}
                      </span>
                    </div>

                    {
      /* Sub-header: Category · Account ID */
    }
                    <div className="text-[11px] font-mono text-color-1/60 uppercase tracking-wider">
                      {category} · {accNum}
                    </div>

                    {
      /* Balance */
    }
                    <div className="pt-1">
                      <p className="text-2xl font-bold text-color-1 font-mono tracking-tight">
                        {formatCurrency(h.balance ?? h.value ?? 0)}
                      </p>
                      <span className="text-[11px] text-color-1/50 font-medium block mt-0.5">
                        Invested amount
                      </span>
                    </div>

                    {
      /* 2x2 Details Grid */
    }
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-space-3 border-t border-color-5/60 text-[11px]">
                      <div>
                        <span className="text-color-1/50 block font-medium">Start date</span>
                        <span className="font-bold text-color-1 block mt-0.5 font-mono">
                          {startDate}
                        </span>
                      </div>

                      <div>
                        <span className="text-color-1/50 block font-medium">Maturity date</span>
                        <span className="font-bold text-color-1 block mt-0.5 font-mono">
                          {h.maturity_date ? formatDate(h.maturity_date) : "Open-ended"}
                        </span>
                      </div>

                      <div>
                        <span className="text-color-1/50 block font-medium">Interest rate</span>
                        <span className="font-bold text-color-1 block mt-0.5 font-mono">
                          {rate}
                        </span>
                      </div>

                      <div>
                        <span className="text-color-1/50 block font-medium mb-0.5">Status</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>;
  })}
            </div>}

          {
    /* AI Copilot Status & Action Banner */
  }
          <div className="p-space-5 rounded-radius-lg bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/80 border border-blue-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-color-2" />
                <h4 className="text-text-sm font-bold text-color-1">
                  {hasGenerated ? "AI Recommendations Generated & Ready" : "AI Next-Best-Action Copilot Ready"}
                </h4>
              </div>
              <p className="text-text-xs text-color-1/70 max-w-xl">
                {hasGenerated ? `Evaluated against institutional policies. ${nbas.length} Next-Best-Actions available for review.` : "Client portfolio positions and financial baseline loaded. Click below to analyze holdings against institutional wealth policies, detect triggers, and generate grounded recommendations."}
              </p>
            </div>

            <button
    type="button"
    disabled={isGeneratingLoading || generateMutation.isPending}
    onClick={hasGenerated ? () => setActiveTab("nbas") : handleGenerate}
    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-radius-md bg-color-2 hover:bg-color-3 text-white text-text-xs font-semibold shadow-xs shrink-0 transition-all disabled:opacity-50"
  >
              {isGeneratingLoading ? <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </> : hasGenerated ? <span>View Next-Best-Actions →</span> : <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Recommendations</span>
                </>}
            </button>
          </div>
        </div>}

      {
    /* Next-Best-Actions Tab */
  }
      {activeTab === "nbas" && <div className="space-y-space-4">
          {!hasGenerated ? <div className="p-space-8 rounded-radius-lg bg-color-7 border border-color-5 shadow-sm text-center space-y-space-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 text-color-2 flex items-center justify-center mx-auto">
                <Compass className="w-6 h-6 text-color-2" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-text-base font-bold text-color-1 font-heading">
                  Next-Best-Actions Not Yet Generated
                </h3>
                <p className="text-text-xs text-color-1/60 leading-relaxed">
                  No action recommendations have been evaluated for this client session yet. Click the button below to initiate policy retrieval, check client risk suitability, and generate grounded recommendations.
                </p>
              </div>
              <button
    type="button"
    disabled={isGeneratingLoading || generateMutation.isPending}
    onClick={handleGenerate}
    className="inline-flex items-center gap-2 px-4 py-2 rounded-radius-md bg-color-2 hover:bg-color-3 text-white text-text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
  >
                {isGeneratingLoading ? <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </> : <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Recommendations</span>
                  </>}
              </button>
            </div> : isNbasLoading ? <LoadingState message="Loading recommendations..." /> : nbas.length === 0 ? <EmptyState
    title="No Recommendations Generated"
    message="Click 'Generate Recommendations' above to run the recommendation engine."
  /> : <div className="space-y-space-3">
              {nbas.map((nba) => <div
    key={nba.id}
    onClick={() => navigate(`/rm/nbas/${nba.id}`)}
    className="p-space-4 rounded-radius-lg bg-color-7 border border-color-5 shadow-sm hover:border-color-2 cursor-pointer transition-all space-y-space-2"
  >
                  <div className="flex items-center justify-between">
                    <span className="text-text-sm font-bold text-color-1 font-heading">{nba.title}</span>
                    <div className="flex items-center gap-space-2">
                      <StatusBadge status={nba.priority} />
                      <StatusBadge status={nba.status} />
                    </div>
                  </div>

                  <p className="text-text-xs text-color-1/70 leading-relaxed">{nba.reason}</p>

                  <div className="flex items-center justify-between pt-space-2 border-t border-color-5/60 text-[11px]">
                    <span className="text-color-1/50">
                      Evidence citations: <strong>{nba.evidence?.length || 0} citations (signals & policy guidelines)</strong>
                    </span>
                    <span className="text-color-2 font-semibold flex items-center gap-1 hover:underline">
                      <span>Review Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>)}
            </div>}
        </div>}
    </div>;
};
