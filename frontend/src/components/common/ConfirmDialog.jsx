import { AlertTriangle, X } from "lucide-react";
export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;
  return <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="confirm-dialog-title"
    className="fixed inset-0 z-50 flex items-center justify-center p-space-4 bg-color-1/60 backdrop-blur-sm animate-fade-in"
  >
      <div className="bg-color-7 border border-color-5 rounded-radius-lg shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-space-5 space-y-space-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-2.5">
              <div
    className={`p-2 rounded-radius-md ${isDestructive ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"}`}
  >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 id="confirm-dialog-title" className="text-text-base font-bold text-color-1 font-heading">
                {title}
              </h3>
            </div>
            <button
    type="button"
    onClick={onCancel}
    className="text-color-1/40 hover:text-color-1 p-1"
    aria-label="Close dialog"
  >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-text-xs text-color-1/70 leading-relaxed">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-space-2 p-space-4 bg-color-6 border-t border-color-5">
          <button
    type="button"
    disabled={isLoading}
    onClick={onCancel}
    className="px-space-4 py-space-2 rounded-radius-md border border-color-5 text-color-1/70 hover:bg-color-5 text-text-xs font-semibold"
  >
            {cancelLabel}
          </button>
          <button
    type="button"
    disabled={isLoading}
    onClick={onConfirm}
    className={`px-space-4 py-space-2 rounded-radius-md text-text-xs font-semibold text-white shadow-sm transition-all ${isDestructive ? "bg-red-600 hover:bg-red-700" : "bg-color-2 hover:bg-color-3"}`}
  >
            {isLoading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>;
};
