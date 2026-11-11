import { AlertCircle, RefreshCw } from "lucide-react";
export const ErrorState = ({
  title = "Service Unavailable",
  message = "Failed to load banking records. Please try again or check backend health.",
  onRetry
}) => {
  return <div
    role="alert"
    className="flex flex-col items-center justify-center p-space-8 text-center rounded-radius-lg bg-color-7 border border-red-200 shadow-sm min-h-[220px]"
  >
      <div className="p-space-3 rounded-full bg-red-50 text-red-600 mb-space-3 border border-red-100">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h3 className="text-text-base font-bold text-color-1 mb-1 font-heading">{title}</h3>
      <p className="text-text-xs text-color-1/70 max-w-md mb-space-4 leading-relaxed">{message}</p>
      {onRetry && <button
    type="button"
    onClick={onRetry}
    className="interactive inline-flex items-center gap-space-2 px-space-4 py-space-2 rounded-radius-md bg-color-6 hover:bg-color-5 text-color-1 text-text-xs font-semibold border border-color-5 transition-all shadow-sm"
  >
          <RefreshCw className="w-3.5 h-3.5 text-color-2" />
          <span>Retry Operation</span>
        </button>}
    </div>;
};
