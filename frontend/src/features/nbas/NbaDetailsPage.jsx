import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ShieldAlert,
  User,
  CheckCircle2,
  XCircle,
  Send
} from "lucide-react";
import { nbaService } from "../../services/nbaService";
import { StatusBadge } from "../../components/common/StatusBadge";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";
import { formatDate } from "../../utils/formatters";
import { GroundedEvidenceCard } from "./GroundedEvidenceCard";
import { SuitabilityGuardrailsCard } from "../outreach/SuitabilityGuardrailsCard";
export const NbaDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dismissModalOpen, setDismissModalOpen] = useState(false);
  const [dismissRationale, setDismissRationale] = useState("");
  const [actionSuccess, setActionSuccess] = useState(null);
  const { data: nbaData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["nba-details", id],
    queryFn: async () => {
      if (!id) throw new Error("Missing NBA ID");
      const res = await nbaService.getNbaById(id);
      return res.data;
    },
    enabled: Boolean(id)
  });
  const { data: suitabilityData, isLoading: isSuitabilityLoading } = useQuery({
    queryKey: ["nba-suitability", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await nbaService.getNbaSuitability(id);
      return res.data;
    },
    enabled: Boolean(id)
  });
  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      return nbaService.acceptNba(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nba-details", id] });
      queryClient.invalidateQueries({ queryKey: ["nba-queue"] });
      setActionSuccess("Recommendation accepted. You can now compose outreach.");
      setTimeout(() => setActionSuccess(null), 4e3);
    }
  });
  const dismissMutation = useMutation({
    mutationFn: async (rationale) => {
      if (!id) return;
      return nbaService.dismissNba(id, rationale);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nba-details", id] });
      queryClient.invalidateQueries({ queryKey: ["nba-queue"] });
      setDismissModalOpen(false);
      setDismissRationale("");
      setActionSuccess("Recommendation dismissed with documented compliance rationale.");
      setTimeout(() => setActionSuccess(null), 4e3);
    }
  });
  if (isLoading) {
    return <LoadingState message="Fetching recommendation evidence & suitability engine audit..." />;
  }
  if (isError) {
    return <ErrorState
      title="Failed to Load Recommendation"
      message={error?.message || "Record not found or access restricted"}
      onRetry={refetch}
    />;
  }
  const nba = nbaData || {};
  const client = nba.client || {};
  const evidence = nba.evidence || [];
  const suitability = suitabilityData || nba.suitability;
  const isSuitabilityRejected = suitability?.is_suitable === false || suitability?.overall_status === "FAIL";
  const isAccepted = nba.status === "ACTIONED" || nba.status === "ACCEPTED" || nba.status === "COMPLETED" || acceptMutation.isSuccess;
  return <div className="space-y-space-6 pb-space-12 max-w-6xl">
      {
    /* Back Link */
  }
      <div>
        <button
    type="button"
    onClick={() => {
      if (client.id) {
        navigate(`/rm/clients/${client.id}`);
      } else {
        navigate("/rm/clients");
      }
    }}
    className="inline-flex items-center gap-space-2 text-text-xs font-semibold text-color-2 hover:underline"
  >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Client Profile</span>
        </button>
      </div>

      {
    /* Header Banner */
  }
      <div className="p-space-6 rounded-radius-lg bg-color-7 border border-color-5 shadow-sm space-y-space-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-4">
          <div className="space-y-1">
            <div className="flex items-center gap-space-2">
              <span className="text-[11px] font-mono text-color-1/50 uppercase tracking-wider">
                {nba.action_type?.replace(/_/g, " ")}
              </span>
              <span>•</span>
              <span className="text-[11px] font-mono text-color-1/40">
                Generated {formatDate(nba.generated_at)}
              </span>
            </div>
            <h1 className="text-text-xl sm:text-text-2xl font-bold text-color-1 font-heading">
              {nba.title}
            </h1>
            <div className="flex items-center gap-2 pt-1 text-text-xs">
              <span className="text-color-1/60">Assigned Client:</span>
              <Link
    to={`/rm/clients/${client?.id || nba.client_id || "c-101"}`}
    className="font-semibold text-color-2 hover:underline inline-flex items-center gap-1"
    title="Open Client 360 View"
  >
                <User className="w-3.5 h-3.5" />
                <span>{client?.full_name || "Assigned Client"}</span>
                <span className="text-[10px] text-color-2/80 font-mono font-medium">(View Client 360 →)</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-space-2 shrink-0">
            <StatusBadge status={nba.priority} size="md" />
            <StatusBadge status={nba.status} size="md" />
          </div>
        </div>

        <p className="text-text-sm text-color-1/80 leading-relaxed bg-color-6/40 p-space-4 rounded-radius-md border border-color-5/60">
          {nba.reason}
        </p>

        {
    /* Action Success Alert */
  }
        {actionSuccess && <div className="p-space-3 rounded-radius-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>}

        {
    /* Action Controls */
  }
        <div className="flex flex-wrap items-center gap-space-3 pt-space-2 border-t border-color-5">
          <button
    type="button"
    disabled={acceptMutation.isPending || isAccepted}
    onClick={() => acceptMutation.mutate()}
    className="px-space-4 py-space-2 rounded-radius-md bg-emerald-700 hover:bg-emerald-800 text-white text-text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
  >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isAccepted ? "Recommendation Accepted" : "Accept Recommendation"}</span>
          </button>

          <button
    type="button"
    disabled={dismissMutation.isPending || nba.status === "DISMISSED"}
    onClick={() => setDismissModalOpen(true)}
    className="px-space-4 py-space-2 rounded-radius-md bg-color-6 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-color-5 text-color-1 text-text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
  >
            <XCircle className="w-4 h-4" />
            <span>Dismiss</span>
          </button>

          <div className="ml-auto flex items-center gap-space-2">
            {!isAccepted && !isSuitabilityRejected && <span className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-radius-sm">
                Accept recommendation first to enable Outreach Composer
              </span>}
            <button
    type="button"
    disabled={!isAccepted || isSuitabilityRejected || acceptMutation.isPending}
    onClick={() => navigate(`/rm/nbas/${nba.id}/outreach`)}
    title={!isAccepted ? "Click 'Accept Recommendation' to enable Outreach Composer" : isSuitabilityRejected ? "Suitability guardrail failed" : "Proceed to Outreach Composer"}
    className="px-space-4 py-space-2 rounded-radius-md bg-color-2 hover:bg-color-3 text-white text-text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
  >
              <Send className="w-3.5 h-3.5" />
              <span>Proceed to Outreach Composer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grounding Evidence Citations & Suitability Guardrails Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-5 items-start">
        <GroundedEvidenceCard evidence={evidence} pageSize={4} />
        <SuitabilityGuardrailsCard
          suitability={suitability}
          client={client}
          nba={nba}
          isLoading={isSuitabilityLoading}
          isDraftGenerated={true}
        />
      </div>

      {
    /* Dismissal Reason Modal */
  }
      {dismissModalOpen && <div
    role="dialog"
    aria-modal="true"
    className="fixed inset-0 z-50 flex items-center justify-center p-space-4 bg-color-1/60 backdrop-blur-sm"
  >
          <div className="bg-color-7 border border-color-5 rounded-radius-lg shadow-2xl w-full max-w-md p-space-5 space-y-space-4">
            <div>
              <h3 className="text-text-base font-bold text-color-1 font-heading">
                Document Dismissal Rationale
              </h3>
              <p className="text-text-xs text-color-1/60 mt-1">
                Institutional compliance requires documenting why this recommendation is not being pursued.
              </p>
            </div>

            <textarea
    rows={3}
    value={dismissRationale}
    onChange={(e) => setDismissRationale(e.target.value)}
    placeholder="e.g. Client confirmed liquidity is allocated to upcoming tax liability."
    className="w-full bg-color-6 border border-color-5 rounded-radius-md p-space-3 text-text-xs text-color-1 placeholder-color-1/40 focus:outline-none focus:border-color-2"
  />

            <div className="flex items-center justify-end gap-space-2 pt-space-2 border-t border-color-5">
              <button
    type="button"
    onClick={() => setDismissModalOpen(false)}
    className="px-space-3 py-space-1.5 rounded-radius-md text-text-xs font-semibold text-color-1/70 hover:bg-color-5"
  >
                Cancel
              </button>
              <button
    type="button"
    disabled={!dismissRationale.trim() || dismissMutation.isPending}
    onClick={() => dismissMutation.mutate(dismissRationale.trim())}
    className="px-space-4 py-space-1.5 rounded-radius-md bg-red-600 hover:bg-red-700 text-color-1 text-text-xs font-semibold disabled:opacity-50"
  >
                {dismissMutation.isPending ? "Dismissing..." : "Confirm Dismissal"}
              </button>
            </div>
          </div>
        </div>}
    </div>;
};
