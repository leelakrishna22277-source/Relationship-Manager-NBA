import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Phone, X, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { outreachService } from "../../services/outreachService";
const STATUS_OPTIONS = [
  { value: "CONTACT_ATTEMPTED", label: "Contact Attempted", desc: "Call placed or email sent, awaiting response" },
  { value: "CONTACTED", label: "Client Reached & Spoke", desc: "Direct conversation or reply received" },
  { value: "NO_RESPONSE", label: "No Response / Voicemail", desc: "Left voicemail or no answer received" },
  { value: "FOLLOW_UP_REQUIRED", label: "Follow-up Scheduled", desc: "Client requested a callback at a later time" },
  { value: "COMPLETED", label: "Interaction Concluded", desc: "Discussion finalized; ready to record NBA outcome" }
];
export const LogContactActivityModal = ({
  isOpen,
  onClose,
  outreachId,
  clientName,
  defaultMethod = "CALL"
}) => {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState(defaultMethod);
  const [status, setStatus] = useState("CONTACTED");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);
  const mutation = useMutation({
    mutationFn: async () => {
      return outreachService.recordContactActivity(outreachId, {
        contact_method: method,
        contact_status: status,
        notes: notes.trim() || void 0,
        follow_up_date: followUpDate || void 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-activities", outreachId] });
      queryClient.invalidateQueries({ queryKey: ["rm-dashboard"] });
      onClose();
    },
    onError: (err) => {
      setErrorMsg(err.message || "Failed to log contact activity.");
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
    aria-labelledby="contact-activity-modal-title"
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
  >
      <div className="relative w-full max-w-lg bg-color-7 border border-color-5 rounded-radius-lg shadow-2xl overflow-hidden animate-fade-in">
        {
    /* Modal Header */
  }
        <div className="flex items-center justify-between px-6 py-4 border-b border-color-5 bg-color-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-radius-md bg-color-4 border border-color-5 flex items-center justify-center text-color-2">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 id="contact-activity-modal-title" className="text-base font-bold text-color-1 font-heading">
                Log Contact Activity
              </h3>
              <p className="text-xs text-color-1/60">
                Contact attempt with <span className="font-semibold text-color-1">{clientName}</span>
              </p>
            </div>
          </div>
          <button
    type="button"
    onClick={onClose}
    className="p-1 rounded-radius-sm text-color-1/40 hover:text-color-1 hover:bg-color-5 transition-colors"
    aria-label="Close modal"
  >
            <X className="w-5 h-5" />
          </button>
        </div>

        {
    /* Modal Form */
  }
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && <div className="p-3 bg-red-50 border border-red-200 rounded-radius-md flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>}

          {
    /* Contact Method Indicator (Phone Call Only) */
  }
          <div>
            <label className="block text-text-xs font-semibold text-color-1/80 mb-2">
              Communication Method
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-radius-md border border-color-2 bg-color-4 text-color-2 text-text-xs font-semibold">
              <Phone className="w-4 h-4 shrink-0" />
              <span>Phone Call</span>
            </div>
          </div>

          {
    /* Contact Status */
  }
          <div>
            <label htmlFor="contact-status-select" className="block text-text-xs font-semibold text-color-1/80 mb-2">
              Interaction Result
            </label>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((opt) => <label
    key={opt.value}
    className={`flex items-start gap-3 p-2.5 rounded-radius-md border cursor-pointer transition-all ${status === opt.value ? "border-color-2 bg-color-4/40 text-color-1" : "border-color-5 bg-color-6 text-color-1/70 hover:bg-color-5/50"}`}
  >
                  <input
    type="radio"
    name="contact-status"
    value={opt.value}
    checked={status === opt.value}
    onChange={() => setStatus(opt.value)}
    className="mt-1 text-color-2 focus:ring-color-2"
  />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-xs font-semibold text-color-1">{opt.label}</p>
                    <p className="text-[11px] text-color-1/60 leading-tight">{opt.desc}</p>
                  </div>
                </label>)}
            </div>
          </div>

          {
    /* Notes */
  }
          <div>
            <label htmlFor="contact-notes" className="block text-text-xs font-semibold text-color-1/80 mb-1.5">
              Call / Discussion Notes
            </label>
            <textarea
    id="contact-notes"
    rows={3}
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    placeholder="e.g. Spoke with client regarding 6-month Fixed Deposit maturity; requested interest rate sheet for Treasury Bills..."
    className="w-full px-3 py-2 bg-color-6 border border-color-5 rounded-radius-md text-text-xs text-color-1 placeholder-color-1/40 focus:outline-none focus:border-color-2 focus:ring-1 focus:ring-color-2 transition-colors"
  />
          </div>

          {
    /* Follow-up date (if required) */
  }
          {(status === "FOLLOW_UP_REQUIRED" || status === "CONTACT_ATTEMPTED") && <div>
              <label htmlFor="follow-up-date" className="block text-text-xs font-semibold text-color-1/80 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Scheduled Follow-up Date
              </label>
              <input
    id="follow-up-date"
    type="date"
    value={followUpDate}
    onChange={(e) => setFollowUpDate(e.target.value)}
    className="w-full px-3 py-2 bg-color-6 border border-color-5 rounded-radius-md text-text-xs text-color-1 focus:outline-none focus:border-color-2 focus:ring-1 focus:ring-color-2"
  />
            </div>}

          {
    /* Footer Actions */
  }
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-color-5">
            <button
    type="button"
    onClick={onClose}
    disabled={mutation.isPending}
    className="px-4 py-2 rounded-radius-md text-text-xs font-semibold text-color-1/70 hover:bg-color-5 transition-colors"
  >
              Cancel
            </button>
            <button
    type="submit"
    disabled={mutation.isPending}
    className="inline-flex items-center gap-2 px-4 py-2 rounded-radius-md text-text-xs font-semibold bg-color-2 hover:bg-color-3 text-white transition-all shadow-sm disabled:opacity-50"
  >
              {mutation.isPending ? <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Recording...
                </> : <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Save Activity
                </>}
            </button>
          </div>
        </form>
      </div>
    </div>;
};
