import { Inbox, Plus } from "lucide-react";
export const EmptyState = ({
  title = "No Records Found",
  message = "There are no active records matching your criteria.",
  actionLabel,
  onAction,
  icon: Icon = Inbox
}) => {
  return <div className="flex flex-col items-center justify-center p-space-12 text-center rounded-radius-lg bg-color-7 border border-color-5 shadow-sm min-h-[200px]">
      <div className="p-space-3 rounded-full bg-color-6 text-color-1/50 mb-space-3 border border-color-5">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-text-base font-bold text-color-1 mb-1 font-heading">{title}</h3>
      <p className="text-text-xs text-color-1/60 max-w-sm mb-space-4 leading-relaxed">{message}</p>
      {actionLabel && onAction && <button
    type="button"
    onClick={onAction}
    className="interactive inline-flex items-center gap-space-2 px-space-4 py-space-2 rounded-radius-md bg-color-2 hover:bg-color-3 text-white text-text-xs font-semibold shadow-sm transition-all"
  >
          <Plus className="w-3.5 h-3.5" />
          <span>{actionLabel}</span>
        </button>}
    </div>;
};
