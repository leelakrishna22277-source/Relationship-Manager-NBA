import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, AlertCircle, X, Calendar, CheckCircle2 } from "lucide-react";
import { outcomeService } from "../../services/outcomeService";
const OUTCOME_OPTIONS = [
  { value: "INTERESTED", label: "Client Interested", description: "Client showed positive interest in the product proposition" },
  { value: "CONVERTED", label: "Converted / Invested", description: "Client authorized transaction or completed deposit rollover" },
  { value: "FOLLOW_UP_REQUIRED", label: "Follow-up Required", description: "Client requested more time or follow-up discussion" },
  { value: "NOT_INTERESTED", label: "Not Interested", description: "Client declined the recommendation" },
  { value: "NO_RESPONSE", label: "No Response / Unreachable", description: "Multiple contact attempts went unanswered" }
];
export const LogOutcomeModal = ({
  isOpen,
  onClose,
  nba,
  onSuccess,
  initialData
}) => {
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState(initialData?.outcome || "INTERESTED");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [followUpDate, setFollowUpDate] = useState(initialData?.follow_up_date || "");
  const [errorMsg, setErrorMsg] = useState(null);
  React.useEffect(() => {
    if (initialData) {
      if (initialData.outcome) setOutcome(initialData.outcome);
      if (initialData.notes !== void 0) setNotes(initialData.notes);
      if (initialData.follow_up_date !== void 0) setFollowUpDate(initialData.follow_up_date);
    }
  }, [initialData]);
  const mutation = useMutation({
    mutationFn: async () => {
      return outcomeService.recordOutcome(nba.id, {
        outcome,
        notes: notes.trim() || void 0,
        follow_up_date: followUpDate || void 0,
        action_taken: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nba-details", nba.id] });
      queryClient.invalidateQueries({ queryKey: ["rm-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["rm-outcomes"] });
      queryClient.invalidateQueries({ queryKey: ["nba-queue"] });
      onSuccess?.("Outcome saved successfully! Recommendation outcome recorded and NBA marked as completed.");
      onClose();
    },
    onError: (err) => {
      setErrorMsg(err.message || "Failed to record recommendation outcome.");
    }
  });
  if (!isOpen) return null;
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg(null);
    mutation.mutate();
  };
  return <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="outcome-modal-title"
    className="fixed inset-0 z-50 flex items-center justify-center p-space-4 bg-color-1/60 backdrop-blur-sm animate-fade-in"
  >
      <div className="bg-color-7 border border-color-5 rounded-radius-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {
    /* Header */
  }
        <div className="flex items-center justify-between p-space-5 border-b border-color-5 bg-color-6/40">
          <div>
            <h2 id="outcome-modal-title" className="text-text-lg font-bold text-color-1 flex items-center gap-space-2 font-heading">
              <CheckSquare className="w-5 h-5 text-color-2" />
              {initialData ? "Edit Recommendation Outcome" : "Log Recommendation Outcome"}
            </h2>
            <p className="text-text-xs text-color-1/60 mt-0.5">
              {initialData ? `Update logged outcome and notes for ${nba.title}` : `Record customer response for ${nba.title}`}
            </p>
          </div>
          <button
    type="button"
    onClick={onClose}
    className="p-space-2 text-color-1/50 hover:text-color-1 rounded-radius-md hover:bg-color-5 transition-colors"
    aria-label="Close dialog"
  >
            <X className="w-5 h-5" />
          </button>
        </div>

        {
    /* Form Body */
  }
        <form onSubmit={handleSubmit} className="p-space-5 space-y-space-4">
          {errorMsg && <div className="p-space-3 bg-red-50 border border-red-200 rounded-radius-md flex items-center gap-space-2 text-text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>}

          {
    /* Outcome Radio Grid */
  }
          <div className="space-y-space-2">
            <label className="block text-text-xs font-semibold text-color-1/80">
              Customer Response
            </label>
            <div className="grid grid-cols-1 gap-space-2">
              {OUTCOME_OPTIONS.map((opt) => <label
    key={opt.value}
    className={`flex items-start gap-space-3 p-space-3 rounded-radius-md border cursor-pointer transition-all ${outcome === opt.value ? "bg-color-4/40 border-color-2 shadow-xs" : "bg-color-6 border-color-5 hover:bg-color-5/50"}`}
  >
                  <input
    type="radio"
    name="outcome-selection"
    value={opt.value}
    checked={outcome === opt.value}
    onChange={() => setOutcome(opt.value)}
    className="mt-0.5 text-color-2"
  />
                  <div>
                    <span className="text-text-xs font-bold text-color-1 block">{opt.label}</span>
                    <span className="text-[11px] text-color-1/60">{opt.description}</span>
                  </div>
                </label>)}
            </div>
          </div>

          {
    /* Conditional Follow-up Date */
  }
          {outcome === "FOLLOW_UP_REQUIRED" && <div>
              <label htmlFor="outcome-followup-date" className="block text-text-xs font-semibold text-color-1/80 mb-space-1.5 flex items-center gap-space-1">
                <Calendar className="w-3.5 h-3.5" />
                Scheduled Follow-up Date
              </label>
              <input
    id="outcome-followup-date"
    type="date"
    required
    value={followUpDate}
    onChange={(e) => setFollowUpDate(e.target.value)}
    className="w-full bg-color-6 border border-color-5 rounded-radius-md px-space-3 py-space-2 text-text-sm text-color-1 focus:outline-none focus:border-color-2"
  />
            </div>}

          {
    /* Notes */
  }
          <div>
            <label htmlFor="outcome-notes" className="block text-text-xs font-semibold text-color-1/80 mb-space-1.5">
              RM Context & Closing Notes
            </label>
            <textarea
    id="outcome-notes"
    rows={3}
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    placeholder="e.g. Client agreed to rollover $250k into 12M Premier Fixed Deposit. Execution mandate pending signature."
    className="w-full bg-color-6 border border-color-5 rounded-radius-md p-space-3 text-text-sm text-color-1 placeholder-color-1/40 focus:outline-none focus:border-color-2"
  />
          </div>

          {
    /* Modal Actions */
  }
          <div className="flex items-center justify-end gap-space-2 pt-space-2 border-t border-color-5">
            <button
    type="button"
    onClick={onClose}
    disabled={mutation.isPending}
    className="px-space-4 py-space-2 rounded-radius-md text-text-xs font-semibold text-color-1/70 hover:bg-color-5 transition-colors"
  >
              Cancel
            </button>
            <button
    type="submit"
    disabled={mutation.isPending}
    className="flex items-center gap-space-2 px-space-4 py-space-2 rounded-radius-md bg-color-2 hover:bg-color-3 text-white text-text-xs font-semibold shadow-sm transition-all disabled:opacity-60"
  >
              <CheckCircle2 className="w-4 h-4" />
              {mutation.isPending ? "Recording..." : initialData ? "Update Final Outcome" : "Save Final Outcome"}
            </button>
          </div>
        </form>
      </div>
    </div>;
};
