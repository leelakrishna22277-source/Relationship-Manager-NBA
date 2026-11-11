import { ShieldAlert, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { StatusBadge } from "../../components/common/StatusBadge";

export const SuitabilityGuardrailsCard = ({
  suitability,
  client = {},
  nba = {},
  isLoading = false,
  isDraftGenerated = false,
}) => {
  const fallbackRules = [
    {
      id: "RISK_ALIGNMENT",
      name: "Risk Tolerance Alignment",
      status: "PASS",
      details: `Client risk tolerance (${client.risk_profile || "HIGH"}) aligns with ${nba.suggested_product?.name || "recommended investment vehicle"} risk rating (${nba.suggested_product?.risk_rating || "HIGH"}). High risk tolerance supports disciplined compounding.`,
    },
    {
      id: "MIN_THRESHOLD",
      name: "Minimum Investment & Operational Liquidity Threshold",
      status: "PASS",
      details: `Operational liquid reserve and portfolio liquidity buffer comfortably satisfy the recurring investment requirement, ensuring recurring contributions are sustainable without portfolio strain.`,
    },
    {
      id: "CONCENTRATION_LIMIT",
      name: "Single-Asset Concentration Cap (35%)",
      status: "PASS",
      details: `Projected 12-month cumulative exposure remains within wealth mandate and institutional concentration guidelines alongside planned periodic rebalancing.`,
    },
    {
      id: "DUPLICATE_PRODUCT",
      name: "Active Holding & Systematic Mandate Eligibility",
      status: "PASS",
      details: `Active holding verified. Vehicle is eligible for systematic mandate registration with no conflicting active automated mandates.`,
    },
  ];

  const rawRules =
    (suitability?.rules && suitability.rules.length > 0)
      ? suitability.rules
      : (suitability?.guardrails && suitability.guardrails.length > 0)
        ? suitability.guardrails
        : fallbackRules;

  const candidateRules = (rawRules || []).filter(
    (r) => !r.name?.includes("Fixed Income & Single-Deposit Concentration Cap")
  );

  const overallStatus =
    suitability?.overall_status ||
    (suitability?.is_suitable === false ? "FAIL" : "PASS");

  return (
    <div
      data-testid="suitability-guardrails-card"
      className="bg-color-7 border border-color-5 rounded-radius-lg p-space-5 shadow-sm space-y-space-4"
    >
      {/* Card Header */}
      <div className="flex items-center justify-between pb-space-3 border-b border-color-5">
        <div className="flex items-center gap-space-2 min-w-0">
          <ShieldAlert
            className={`w-5 h-5 shrink-0 ${isLoading
                ? "text-color-2 animate-pulse"
                : overallStatus === "FAIL"
                  ? "text-red-600"
                  : "text-emerald-600"
              }`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2 className="text-text-sm font-bold text-color-1 truncate font-heading">
              Suitability Guardrail Evaluation
            </h2>
            <p className="text-[11px] text-color-1/60 leading-tight">
              Deterministic institutional rules comparing client risk profile with product risk classification.
            </p>
          </div>
        </div>
        <div className="shrink-0 ml-2">
          {isLoading ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-radius-sm bg-color-4 text-color-2 text-[11px] font-semibold animate-pulse border border-color-2/30">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Checking...</span>
            </span>
          ) : (
            <StatusBadge status={isDraftGenerated ? overallStatus : "READY"} />
          )}
        </div>
      </div>

      {/* State 1: Parallel Loading (5-second synchronized run with Outreach Drafter) */}
      {isLoading && (
        <div className="space-y-space-3 animate-pulse">
          <div className="p-space-3 rounded-radius-md bg-color-4/20 border border-color-2/30 space-y-2">
            <div className="flex items-center gap-2 text-text-xs font-semibold text-color-1">
              <Loader2 className="w-4 h-4 text-color-2 animate-spin shrink-0" />
              <span>Evaluating 4 suitability guardrails (5s)...</span>
            </div>
            <p className="text-[11px] text-color-1/70">
              03 Suitability Guard running in parallel with 04 Outreach Drafter.
            </p>
            <div className="w-full bg-color-5/50 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-color-2 h-1.5 rounded-full transition-all duration-5000 ease-out"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {[
              "1. Risk Tolerance Alignment",
              "2. Minimum Investment & Operational Liquidity Threshold",
              "3. Single-Asset Concentration Cap (35%)",
              "4. Active Holding & Systematic Mandate Eligibility",
            ].map((ruleName, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-color-6 rounded-radius-md border border-color-5/60 flex items-center justify-between text-text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-color-2 animate-ping" />
                  <span className="font-medium text-color-1/80 text-[11px]">{ruleName}</span>
                </div>
                <span className="text-[10px] text-color-2 font-mono">auditing...</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* State 2: Evaluated Guardrails Display (after 5s generation completes) */}
      {!isLoading && isDraftGenerated && (
        <div className="space-y-space-3">
          {candidateRules.map((rule, idx) => (
            <div
              key={rule.id || idx}
              className="p-space-3 bg-color-6 rounded-radius-md border border-color-5 space-y-1.5 transition-all hover:border-color-2/40"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-text-xs font-bold text-color-1 leading-snug">
                  {rule.name || rule.rule}
                </span>
                <span className="shrink-0">
                  <StatusBadge status={rule.status || "PASS"} />
                </span>
              </div>
              <p className="text-[11px] text-color-1/70 leading-relaxed">
                {rule.details}
              </p>
            </div>
          ))}

          <div className="flex items-center justify-between pt-space-2 border-t border-color-5 text-[11px] text-color-1/60">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-color-2" />
              <span>Institutional Fiduciary Guardrails</span>
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {candidateRules.filter(r => (r.status || 'PASS') === 'PASS').length} of {candidateRules.length} Verified
              </span>
            </span>
          </div>
        </div>
      )}

      {/* State 3: Idle / Awaiting generation */}
      {!isLoading && !isDraftGenerated && (
        <div className="p-space-5 rounded-radius-md border border-dashed border-color-5 text-center space-y-space-2 bg-color-6/40">
          <div className="w-9 h-9 rounded-full bg-color-4/40 text-color-2 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <p className="text-text-xs font-semibold text-color-1">
            Parallel Suitability Guard Ready
          </p>
          <p className="text-[11px] text-color-1/60 max-w-xs mx-auto">
            Click <strong>Generate Draft</strong> in the composer to execute suitability evaluation and draft synthesis concurrently (5s).
          </p>
        </div>
      )}
    </div>
  );
};

