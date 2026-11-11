import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  User,
  Phone,
  RefreshCw,
  ArrowRight,
  XCircle,
  History,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert
} from "lucide-react";
import { nbaService } from "../../services/nbaService";
import { outreachService } from "../../services/outreachService";
import { LogOutcomeModal } from "../outcomes/LogOutcomeModal";
import { LogContactActivityModal } from "../outcomes/LogContactActivityModal";
import { StatusBadge } from "../../components/common/StatusBadge";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";
const STEPS = [
  { id: 1, label: "Call script" },
  { id: 2, label: "Review & edit draft" },
  { id: 3, label: "Save & log outcome" }
];
const CHANNEL_OPTIONS = [
  { id: "CALL_SCRIPT", label: "Call Script", icon: Phone }
];
const TONE_OPTIONS = ["ADVISORY"];
const StepperHeader = ({ currentStep, onStepChange, isDraftReady }) => {
  return <nav aria-label="Composer progress" className="bg-color-7 border border-color-5 rounded-radius-lg p-space-4 shadow-sm">
      <ol className="flex flex-col sm:flex-row sm:items-center gap-space-3">
        {STEPS.map((step, index) => {
    const isActive = step.id === currentStep;
    const isComplete = step.id < currentStep;
    const isDisabled = (step.id === 2 || step.id === 3) && !isDraftReady;
    return <li key={step.id} className="flex items-center gap-space-3 flex-1 min-w-0">
              <button
      type="button"
      disabled={isDisabled}
      aria-current={isActive ? "step" : void 0}
      onClick={() => !isDisabled && onStepChange(step.id)}
      className={`interactive flex items-center gap-space-2.5 rounded-radius-md px-space-3 py-space-2 text-left min-w-0 ${isActive ? "bg-color-4/30 border border-color-2" : isDisabled ? "opacity-40 cursor-not-allowed border border-transparent" : "hover:bg-color-6 border border-transparent"}`}
    >
                <span
      className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-text-xs font-bold border ${isActive ? "bg-color-2 border-color-2 text-white" : isComplete ? "bg-color-4 border-color-2 text-color-2" : "bg-color-6 border-color-5 text-color-1/60"}`}
      aria-hidden="true"
    >
                  {isComplete ? <Check className="w-3.5 h-3.5" /> : step.id}
                </span>
                <span
      className={`text-text-xs font-semibold truncate ${isActive ? "text-color-1" : "text-color-1/60"}`}
    >
                  {step.label}
                </span>
              </button>

              {index < STEPS.length - 1 && <span className="hidden sm:block h-px grow bg-color-5" aria-hidden="true" />}
            </li>;
  })}
      </ol>
    </nav>;
};
export const OutreachComposerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [tone, setTone] = useState("ADVISORY");
  const [channel, setChannel] = useState("CALL_SCRIPT");
  const [customInstructions, setCustomInstructions] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [outreachStatus, setOutreachStatus] = useState("DRAFT");
  const [savedOutreachId, setSavedOutreachId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
  const [outcomeSavedMessage, setOutcomeSavedMessage] = useState(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityMethod, setActivityMethod] = useState("CALL");
  const [isDraftGenerated, setIsDraftGenerated] = useState(false);
  const { data: nbaData, isLoading: isNbaLoading, isError: isNbaError, error: nbaError, refetch: refetchNba } = useQuery({
    queryKey: ["nba-details", id],
    queryFn: async () => {
      if (!id) throw new Error("Missing NBA ID");
      const response = await nbaService.getNbaById(id);
      return response.data;
    },
    enabled: Boolean(id)
  });
  const { data: suitabilityData } = useQuery({
    queryKey: ["nba-suitability", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await nbaService.getNbaSuitability(id);
      return response.data;
    },
    enabled: Boolean(id)
  });
  const { data: existingOutreachData } = useQuery({
    queryKey: ["nba-saved-outreach", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await outreachService.getLatestOutreach(id);
      return response.data;
    },
    enabled: Boolean(id)
  });
  const { data: activitiesData } = useQuery({
    queryKey: ["contact-activities", savedOutreachId || existingOutreachData?.id],
    queryFn: async () => {
      const oid = savedOutreachId || existingOutreachData?.id;
      if (!oid) return [];
      const res = await outreachService.getContactActivities(oid);
      return res.data || [];
    },
    enabled: Boolean(savedOutreachId || existingOutreachData?.id)
  });
  const generateMutation = useMutation({
    mutationFn: async (payload) => {
      if (!id) throw new Error("Missing NBA ID");
      const [res] = await Promise.all([
        outreachService.generateDraft(id, payload),
        new Promise((resolve) => setTimeout(resolve, 5e3))
      ]);
      return res;
    },
    onSuccess: (response) => {
      const data = response.data;
      if (data) {
        setSubject(data.subject || "");
        setBody(data.body || "");
        setOutreachStatus("DRAFT");
        setIsDraftGenerated(true);
        setStep(2);
      }
    }
  });
  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (!id) throw new Error("Missing NBA ID");
      return outreachService.saveOutreach(id, payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["nba-saved-outreach", id] });
      queryClient.invalidateQueries({ queryKey: ["nba-details", id] });
      if (res?.data?.id) {
        setSavedOutreachId(res.data.id);
      }
      setSaveSuccess(true);
      setSaveError(null);
      setTimeout(() => setSaveSuccess(false), 4e3);
    },
    onError: (err) => {
      setSaveError(err.message || "Failed to save outreach draft.");
    }
  });
  const approveMutation = useMutation({
    mutationFn: async () => {
      const oid = savedOutreachId || existingOutreachData?.id;
      if (!oid) {
        const fullText = channel === "EMAIL" && subject ? `Subject: ${subject}

${body}` : body;
        if (!id) throw new Error("Missing NBA ID");
        const res = await outreachService.saveOutreach(id, { draft_text: fullText, status: "APPROVED" });
        return res;
      }
      return outreachService.approveOutreach(oid);
    },
    onSuccess: () => {
      setOutreachStatus("APPROVED");
      queryClient.invalidateQueries({ queryKey: ["nba-saved-outreach", id] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4e3);
    },
    onError: (err) => {
      setSaveError(err.message || "Failed to approve outreach draft.");
    }
  });
  const acceptNbaMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing NBA ID");
      return nbaService.acceptNba(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nba-details", id] });
      queryClient.invalidateQueries({ queryKey: ["nba-queue"] });
    }
  });
  useEffect(() => {
    if (existingOutreachData?.draft_text) {
      setBody(existingOutreachData.draft_text);
      if (existingOutreachData.id) setSavedOutreachId(existingOutreachData.id);
      if (existingOutreachData.status) {
        setOutreachStatus(existingOutreachData.status || "DRAFT");
      }
      setIsDraftGenerated(true);
    }
  }, [existingOutreachData]);
  const handleGenerate = () => {
    setIsDraftGenerated(false);
    generateMutation.mutate({
      tone,
      channel
    });
  };
  const handleCopy = async () => {
    try {
      const fullContent = channel === "EMAIL" && subject ? `Subject: ${subject}

${body}` : body;
      await navigator.clipboard.writeText(fullContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
    }
  };
  const handleProceedToStep3 = async () => {
    if (!body.trim() || body.trim().length < 10) {
      setSaveError("Draft content must be at least 10 characters.");
      return;
    }
    try {
      const res = await outreachService.saveOutreach(id, {
        draft_text: body,
        status: "APPROVED"
      });
      if (res?.data?.id) {
        setSavedOutreachId(res.data.id);
      }
      setOutreachStatus("APPROVED");
      queryClient.invalidateQueries({ queryKey: ["nba-saved-outreach", id] });
      queryClient.invalidateQueries({ queryKey: ["nba-details", id] });
      setStep(3);
    } catch (err) {
      setSaveError(err.message || "Failed to approve draft.");
      setStep(3);
    }
  };
  const handleSave = () => {
    if (!body.trim() || body.trim().length < 10) {
      setSaveError("Draft content must be at least 10 characters.");
      return;
    }
    const fullText = channel === "EMAIL" && subject ? `Subject: ${subject}

${body}` : body;
    saveMutation.mutate({
      draft_text: fullText,
      status: "SAVED"
    });
  };
  if (isNbaLoading) {
    return <LoadingState message="Loading recommendation context & AI composer..." />;
  }
  if (isNbaError) {
    return <ErrorState
      title="Failed to Load NBA Context"
      message={nbaError?.message || "Access restricted or recommendation not found."}
      onRetry={refetchNba}
    />;
  }
  const nba = nbaData || {};
  const client = nba.client || {};
  const suitability = suitabilityData || nba.suitability || {};
  const isSuitabilityRejected = suitability.is_suitable === false || suitability.overall_status === "FAIL";
  const isAccepted = nba.status === "ACTIONED" || nba.status === "ACCEPTED" || nba.status === "COMPLETED" || acceptNbaMutation.isSuccess;
  const citations = generateMutation.data?.data?.grounding_citations || [];
  const disclaimer = generateMutation.data?.data?.disclaimer;
  const generationError = generateMutation.isError ? generateMutation.error?.message || "Failed to generate outreach draft." : null;
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const charCount = body.length;
  const hasDraft = Boolean(body && body.trim().length > 0);
  const clientEmail = client.email || `${client.full_name?.toLowerCase().replace(/\s+/g, ".")}@bank-client.com`;
  const clientPhone = client.phone || "+1-555-0198";
  const mailtoLink = `mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(subject || nba.title || "Banking Advisory")}&body=${encodeURIComponent(body)}`;
  const telLink = `tel:${clientPhone.replace(/[^0-9+]/g, "")}`;
  return <div className="space-y-space-6 pb-space-12">
      {
    /* Back Link */
  }
      <div>
        <Link
    to={`/rm/nbas/${id}`}
    className="inline-flex items-center gap-space-2 text-text-xs font-semibold text-color-2 hover:underline"
  >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Recommendation Detail</span>
        </Link>
      </div>

      {
    /* Header */
  }
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-4 pb-space-4 border-b border-color-5">
        <div className="space-y-1">
          <div className="flex items-center gap-space-2">
            <span className="p-1 rounded-radius-sm bg-color-4 text-color-1">
              <Sparkles className="w-4 h-4 text-color-2" />
            </span>
            <span className="text-text-xs font-bold uppercase tracking-wider text-color-1/70">
              AI Decision-Support System
            </span>
          </div>
          <h1 className="text-text-xl sm:text-text-2xl font-bold text-color-1 font-heading">
            Client Outreach Composer
          </h1>
          <p className="text-text-sm text-color-1/70">
            Personalize evidence-grounded outreach for <strong>{client.full_name}</strong> based on
            deterministic suitability rules
          </p>
        </div>

        {
    /* Status Pills */
  }
        <div className="flex items-center gap-space-2">
          <span className="text-text-xs text-color-1/60 font-semibold">Outreach State:</span>
          <StatusBadge status={outreachStatus} />
        </div>
      </div>

      {
    /* Mandatory Decision Support Disclaimer Banner */
  }
      <div className="bg-color-4/20 border border-color-2 rounded-radius-lg p-space-4 flex items-start gap-space-3 shadow-xs">
        <AlertTriangle className="w-5 h-5 text-color-1 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <h2 className="text-text-xs font-bold text-color-1 uppercase tracking-wider">
            Mandatory Compliance Notice & Human-in-the-Loop Policy
          </h2>
          <p className="text-[12px] text-color-1/90 leading-relaxed">
            {disclaimer || <>
                <strong>DECISION SUPPORT ONLY:</strong> This system produces an internal outreach
                draft for Relationship Manager evaluation. It <strong>never</strong> dispatches
                automated communications directly to clients or executes financial trades. All
                messages must be reviewed, personalized, and transmitted manually via approved bank
                channels.
              </>}
          </p>
        </div>
      </div>

      {
    /* Suitability Guard Alert Banner */
  }
      {isSuitabilityRejected && <div className="p-space-4 rounded-radius-lg bg-red-500/10 border border-red-500/30 flex items-start gap-space-3">
          <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-text-xs font-bold text-red-300 uppercase tracking-wider">
              Suitability Guardrail: Unsuitable Recommendation Suppressed
            </h3>
            <p className="text-text-xs text-red-200">
              This recommendation failed the deterministic suitability policy (client risk profile is below product risk rating). Customer outreach cannot be dispatched or approved for this action.
            </p>
          </div>
        </div>}

      {
    /* Recommendation Acceptance Notice */
  }
      {!isAccepted && !isSuitabilityRejected && <div className="p-space-4 rounded-radius-lg bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-3">
          <div className="flex items-start gap-space-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h3 className="text-text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                Recommendation Pending Acceptance
              </h3>
              <p className="text-text-xs text-amber-700 dark:text-amber-200">
                This NBA is currently in pending state. Formally accept the recommendation to endorse this advisory action.
              </p>
            </div>
          </div>
          <button
    type="button"
    disabled={acceptNbaMutation.isPending}
    onClick={() => acceptNbaMutation.mutate()}
    className="px-space-3 py-space-1.5 rounded-radius-md bg-emerald-700 hover:bg-emerald-800 text-white text-text-xs font-semibold shrink-0 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
  >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{acceptNbaMutation.isPending ? "Accepting..." : "Accept Recommendation"}</span>
          </button>
        </div>}

      {
    /* Stepper */
  }
      {
    /* Outcome Saved Success Notification Banner */
  }
      {(outcomeSavedMessage || nba.status === "COMPLETED") && <div className="p-space-4 rounded-radius-lg bg-emerald-50 border border-emerald-300 text-emerald-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-space-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-text-sm font-bold">
                {outcomeSavedMessage || "Outcome Saved Successfully! NBA Recommendation Completed."}
              </p>
              <p className="text-[12px] text-emerald-700">
                This NBA outcome has been recorded. It has been marked as completed and removed from your active NBA work queue.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-space-2 shrink-0">
            <Link
    to="/rm/nbas"
    className="px-space-3 py-space-1.5 rounded-radius-md bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-text-xs font-semibold inline-flex items-center gap-1 transition-colors"
  >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to NBA Queue</span>
            </Link>
            <Link
    to="/rm/outcomes"
    className="px-space-3 py-space-1.5 rounded-radius-md bg-emerald-700 hover:bg-emerald-800 text-white text-text-xs font-semibold inline-flex items-center gap-1 transition-colors"
  >
              <span>View Outcome History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>}

      <StepperHeader currentStep={step} onStepChange={setStep} isDraftReady={isDraftGenerated} />

      {
    /* Main 2-Column Grid */
  }
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-6 items-start">
        {
    /* Left 2 Cols: Step Content */
  }
        <div className="lg:col-span-2 space-y-space-5">
          {
    /* Step 1 — Call Script Preparation */
  }
          {step === 1 && <div
    role="group"
    aria-label="Step 1: Call Script Preparation"
    className="bg-color-7 border border-color-5 rounded-radius-lg p-space-6 shadow-sm space-y-space-5"
  >
              <div>
                <h2 className="text-text-sm font-bold text-color-1 font-heading mb-space-1">
                  Step 1 • Call Script Preparation
                </h2>
              </div>

              <div>
                <span className="block text-[11px] font-bold text-color-1/70 uppercase tracking-wider mb-1.5">
                  Outreach Format
                </span>
                <div className="inline-flex rounded-radius-sm p-0.5 bg-color-6 border border-color-5">
                  <div className="px-3 py-1.5 rounded-radius-sm text-text-xs font-semibold inline-flex items-center gap-1.5 bg-color-7 text-color-1 shadow-sm">
                    <Phone className="w-3.5 h-3.5 text-color-2" aria-hidden="true" />
                    <span>Call Script</span>
                  </div>
                </div>
              </div>

              {
    /* Clean Generate Draft Button */
  }
              <div className="pt-space-2">
                <button
    type="button"
    disabled={generateMutation.isPending}
    onClick={handleGenerate}
    className="interactive px-space-5 py-2.5 rounded-radius-md bg-color-2 hover:bg-color-3 text-white text-text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
  >
                  {generateMutation.isPending ? <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Draft...</span>
                    </> : <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Draft</span>
                    </>}
                </button>
              </div>

              {
    /* Minimal Clean Analyzing Indicator (during 5-second generation) */
  }
              {generateMutation.isPending && <div className="p-3.5 rounded-radius-md bg-color-4/20 border border-color-2/30 space-y-2 animate-pulse">
                  <div className="flex items-center gap-2 text-text-xs font-semibold text-color-1">
                    <Loader2 className="w-4 h-4 text-color-2 animate-spin shrink-0" />
                    <span>Analyzing portfolio signals and synthesizing call script draft (5s)...</span>
                  </div>
                  <p className="text-[11px] text-color-1/70">
                    Running in parallel with 03 Suitability Guard. Both modules complete in 5 seconds.
                  </p>
                  <div className="w-full bg-color-5/50 rounded-full h-1 overflow-hidden">
                    <div className="bg-color-2 h-1 rounded-full animate-pulse" style={{ width: "100%" }} />
                  </div>
                </div>}

              {
    /* Green Success Message - Only displayed after clicking Generate Draft and draft created */
  }
              {isDraftGenerated && !generateMutation.isPending && <div className="p-space-3 rounded-radius-md bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-text-xs text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-semibold">Message generated successfully</span>
                </div>}

              {
    /* Error */
  }
              {generationError && <div
    role="alert"
    className="p-space-3 rounded-radius-md bg-red-50 border border-red-200 text-red-700 text-text-xs flex items-start gap-2"
  >
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{generationError}</span>
                </div>}

              {
    /* Only show Next button if draft is generated and generation is complete */
  }
              {isDraftGenerated && !generateMutation.isPending && <div className="flex items-center justify-end pt-space-2 border-t border-color-5">
                  <button
    type="button"
    disabled={generateMutation.isPending}
    onClick={() => setStep(2)}
    className="interactive px-space-4 py-space-2 rounded-radius-md bg-color-2 text-white text-text-xs font-semibold hover:bg-color-3 inline-flex items-center gap-space-2 shadow-sm disabled:opacity-50"
  >
                    <span>Next: Review & edit draft</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>}
            </div>}

          {
    /* Step 2 — Review & edit draft */
  }
          {step === 2 && <div
    role="group"
    aria-label="Step 2: Review and edit draft"
    className="bg-color-7 border border-color-5 rounded-radius-lg p-space-6 shadow-sm space-y-space-4"
  >
              <div>
                <h2 className="text-text-sm font-bold text-color-1 font-heading mb-space-1">
                  Step 2 • Review & edit draft
                </h2>
              </div>

              {generateMutation.isPending ? <div className="p-space-8 rounded-radius-md bg-color-6/50 border border-dashed border-color-2/50 text-center space-y-space-4 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-color-4 text-color-2 mx-auto flex items-center justify-center">
                    <Sparkles className="w-6 h-6 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-text-sm font-bold text-color-1">
                      AI Synthesizing Personalized Outreach Draft
                    </h3>
                    <p className="text-text-xs text-color-1/70 max-w-md mx-auto">
                      Formulating advisory tone for <strong>{client.full_name}</strong> grounded in detected triggers and suitability rules.
                    </p>
                  </div>
                  <div className="max-w-md mx-auto space-y-2 py-2">
                    <div className="h-3 bg-color-5 rounded w-full" />
                    <div className="h-3 bg-color-5 rounded w-5/6 mx-auto" />
                    <div className="h-3 bg-color-5 rounded w-4/6 mx-auto" />
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-color-2/10 text-color-2 border border-color-2/20 text-[11px] font-medium font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Streaming advisory draft & citations...</span>
                  </div>
                </div> : <>
                  {channel === "EMAIL" && <div>
                      <label
    htmlFor="email-subject-input"
    className="block text-text-xs font-bold text-color-1 mb-1"
  >
                        Email Subject Line
                      </label>
                      <input
    id="email-subject-input"
    type="text"
    value={subject}
    onChange={(e) => setSubject(e.target.value)}
    placeholder="Subject line..."
    className="w-full px-3 py-2 rounded-radius-sm bg-color-6 border border-color-5 text-color-1 text-text-xs font-medium focus:outline-none focus:border-color-2"
  />
                    </div>}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
    htmlFor="outreach-body-textarea"
    className="text-text-xs font-bold text-color-1"
  >
                        Draft Content (Editable)
                      </label>
                      <span className="text-[11px] text-color-1/60 font-mono">
                        {wordCount} words • {charCount} chars
                      </span>
                    </div>
                    <textarea
    id="outreach-body-textarea"
    rows={12}
    value={body}
    onChange={(e) => {
      setBody(e.target.value);
      if (outreachStatus === "APPROVED") setOutreachStatus("UNDER_REVIEW");
    }}
    placeholder="Draft content will appear here..."
    className="w-full p-4 rounded-radius-sm bg-color-6 border border-color-5 text-color-1 text-text-xs leading-relaxed focus:outline-none focus:border-color-2 font-sans"
  />
                  </div>
                </>}

              {
    /* Action Buttons Toolbar */
  }
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-3 pt-space-3 border-t border-color-5">
                <button
    type="button"
    onClick={handleCopy}
    className="interactive px-space-3 py-space-2 rounded-radius-sm border border-color-5 bg-color-6 hover:bg-color-5 text-color-1 text-text-xs font-medium inline-flex items-center gap-1.5"
  >
                  {copied ? <>
                      <Check className="w-4 h-4 text-green-700" aria-hidden="true" />
                      <span className="text-green-700 font-semibold">Copied to Clipboard!</span>
                    </> : <>
                      <Copy className="w-4 h-4 text-color-1/70" aria-hidden="true" />
                      <span>Copy to Clipboard</span>
                    </>}
                </button>

                <div className="flex items-center gap-space-2">
                  <button
                    type="button"
                    disabled={generateMutation.isPending}
                    onClick={handleGenerate}
                    className="interactive px-space-3 py-space-2 rounded-radius-sm border border-color-5 bg-color-6 hover:bg-color-5 text-color-1 text-text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-color-1/70 ${generateMutation.isPending ? "animate-spin" : ""}`} />
                    <span>{generateMutation.isPending ? "Regenerating..." : "Regenerate"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="interactive px-space-3 py-space-2 rounded-radius-sm border border-color-5 text-color-1 text-text-xs font-medium hover:bg-color-6"
                  >
                    Back
                  </button>
                  <button
    type="button"
    disabled={saveMutation.isPending}
    onClick={handleProceedToStep3}
    className="interactive px-space-4 py-space-2 rounded-radius-md bg-color-2 text-white text-text-xs font-semibold hover:bg-color-3 inline-flex items-center gap-space-2 shadow-sm disabled:opacity-50"
  >
                    <span>{saveMutation.isPending ? "Approving draft..." : "Next: Save & log outcome"}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>}

          {
    /* Step 3 — Save & log outcome */
  }
          {step === 3 && <div
    role="group"
    aria-label="Step 3: Save and log outcome"
    className="bg-color-7 border border-color-5 rounded-radius-lg p-space-6 shadow-sm space-y-space-5"
  >
              <div>
                <h2 className="text-text-sm font-bold text-color-1 font-heading mb-space-1">
                  Step 3 • Save & log outcome
                </h2>
                <p className="text-[12px] text-color-1/60">
                  Save the reviewed draft to the client record, initiate manual outreach, and track the interaction history.
                </p>
              </div>

              {
    /* Draft summary */
  }
              <div className="rounded-radius-md border border-color-5 bg-color-6 px-space-4 py-space-3 space-y-space-2 text-text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-color-1/60">Channel</span>
                  <span className="font-semibold text-color-1">
                    {CHANNEL_OPTIONS.find((option) => option.id === channel)?.label || channel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-color-1/60">Tone</span>
                  <span className="font-semibold text-color-1 capitalize">{tone.toLowerCase()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-color-1/60">Draft Length</span>
                  <span className="font-semibold text-color-1">
                    {wordCount} words • {charCount} chars
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-color-1/60">Outreach Approval State</span>
                  <StatusBadge status={outreachStatus} />
                </div>
              </div>

              {
    /* Save Feedback Alerts */
  }
              {saveSuccess && <div className="p-space-3 rounded-radius-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Outreach draft successfully saved to database.</span>
                </div>}
              {saveError && <div className="p-space-3 rounded-radius-md bg-red-50 border border-red-200 text-red-700 text-text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{saveError}</span>
                </div>}

              {
    /* MANUAL CONTACT SECTION */
  }
              <div className="p-space-4 rounded-radius-lg border border-color-5 bg-color-6/30 space-y-space-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-text-xs font-bold text-color-1 uppercase tracking-wider flex items-center gap-space-1.5">
                    <Phone className="w-4 h-4 text-color-2" />
                    Manual Phone Call Action
                  </h3>
                  <span className="text-[11px] text-color-1/50">Human-Initiated Call</span>
                </div>

                <p className="text-[11px] text-color-1/70 leading-relaxed">
                  Clicking <strong>Call</strong> opens your device's native phone dialer with the client's registered number. Afterwards, record the conversation result below.
                </p>

                <div className="flex flex-wrap items-center gap-space-3 pt-space-1">
                  {
    /* Phone Call Link */
  }
                  <a
    href={isSuitabilityRejected ? void 0 : telLink}
    onClick={() => {
      setActivityMethod("CALL");
    }}
    className={`inline-flex items-center gap-space-2 px-space-4 py-space-2 rounded-radius-md text-text-xs font-semibold border transition-all ${isSuitabilityRejected ? "opacity-40 cursor-not-allowed bg-color-6 border-color-5 text-color-1/40" : "bg-color-6 hover:bg-color-5 text-color-1 border-color-5 hover:border-color-2"}`}
  >
                    <Phone className="w-3.5 h-3.5 text-color-2" />
                    <span>Call via tel: ({clientPhone})</span>
                  </a>

                  {
    /* Record Contact Activity Button */
  }
                  <button
    type="button"
    onClick={() => setActivityModalOpen(true)}
    className="inline-flex items-center gap-space-2 px-space-4 py-space-2 rounded-radius-md bg-color-4/40 hover:bg-color-4 text-color-1 text-text-xs font-semibold border border-color-2 ml-auto"
  >
                    <History className="w-3.5 h-3.5 text-color-2" />
                    <span>Log Contact Attempt</span>
                  </button>
                </div>
              </div>

              {
    /* Contact Activity Chronological Log */
  }
              {activitiesData && activitiesData.length > 0 && <div className="space-y-space-2 pt-space-2">
                  <h4 className="text-text-xs font-bold text-color-1 uppercase tracking-wider flex items-center gap-space-1.5">
                    <History className="w-3.5 h-3.5 text-color-2" />
                    Recent Contact Attempts ({activitiesData.length})
                  </h4>
                  <div className="space-y-space-2">
                    {activitiesData.map((act) => <div
    key={act.id}
    className="p-space-3 rounded-radius-md bg-color-6 border border-color-5 text-text-xs flex items-center justify-between"
  >
                        <div className="flex items-center gap-space-3">
                          <span className="p-1.5 rounded-radius-sm bg-color-5 text-color-1 font-bold">
                            <Phone className="w-3.5 h-3.5" />
                          </span>
                          <div>
                            <span className="font-semibold text-color-1">{act.contact_status.replace(/_/g, " ")}</span>
                            {act.notes && <p className="text-[11px] text-color-1/60 italic mt-0.5">{act.notes}</p>}
                          </div>
                        </div>
                        <span className="text-[11px] text-color-1/50 font-mono">
                          {act.created_at ? new Date(act.created_at).toLocaleDateString() : "Today"}
                        </span>
                      </div>)}
                  </div>
                </div>}

              {
    /* Log Final Outcome Link */
  }
              <div className="pt-space-3 border-t border-color-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <button
    type="button"
    onClick={() => setStep(2)}
    className="interactive px-space-3 py-space-2 rounded-radius-sm border border-color-5 text-color-1 text-text-xs font-medium hover:bg-color-6"
  >
                  Back to Editor
                </button>

                {outcomeSavedMessage || nba.status === "COMPLETED" ? <div className="flex flex-wrap items-center gap-space-2">
                    <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-radius-md text-text-xs font-semibold inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Outcome Saved & Completed</span>
                    </span>
                    <button
    type="button"
    onClick={() => setOutcomeModalOpen(true)}
    className="interactive px-space-3 py-space-1.5 rounded-radius-md border border-color-5 bg-color-6 hover:bg-color-5 text-color-1 text-text-xs font-medium"
  >
                      Update Outcome
                    </button>
                  </div> : activitiesData && activitiesData.length > 0 ? <button
    type="button"
    onClick={() => setOutcomeModalOpen(true)}
    className="interactive px-space-4 py-space-2 rounded-radius-md bg-color-2 hover:bg-color-3 text-white text-text-xs font-semibold inline-flex items-center gap-space-2 shadow-sm"
  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Log Recommendation Outcome</span>
                  </button> : <div className="flex items-center gap-2 text-text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-radius-md">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Log call attempt first to unlock recommendation outcome recording</span>
                  </div>}
              </div>
            </div>}
        </div>

        {
    /* Right Col: Client 360 & Grounding Sidebar */
  }
        <aside aria-label="Client and evidence context" className="space-y-space-5">
          {
    /* Client Profile Context */
  }
          <div className="bg-color-7 border border-color-5 rounded-radius-lg p-space-5 shadow-sm space-y-space-3">
            <h2 className="text-text-xs font-bold text-color-1 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-color-2" aria-hidden="true" />
              <span>Target Client Profile</span>
            </h2>

            <div className="space-y-2 text-text-xs">
              <div className="flex items-center justify-between">
                <span className="text-color-1/60">Name</span>
                <span className="font-semibold text-color-1">{client.full_name || "\u2014"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-color-1/60">Segment</span>
                <StatusBadge status={client.segment || "PREMIER"} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-color-1/60">Risk Tolerance</span>
                <StatusBadge status={client.risk_profile || "MODERATE"} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-color-5/60">
                <span className="text-color-1/60">Suitability Status</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified (PASS)</span>
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {
    /* Outcome Logging Modal */
  }
      {outcomeModalOpen && <LogOutcomeModal
    isOpen={outcomeModalOpen}
    onClose={() => setOutcomeModalOpen(false)}
    onSuccess={(msg) => {
      setOutcomeSavedMessage(msg);
    }}
    nba={nba}
  />}

      {
    /* Contact Activity Logging Modal */
  }
      {activityModalOpen && <LogContactActivityModal
    isOpen={activityModalOpen}
    onClose={() => setActivityModalOpen(false)}
    outreachId={savedOutreachId || existingOutreachData?.id || id || ""}
    clientName={client.full_name}
    defaultMethod={activityMethod}
  />}
    </div>;
};
