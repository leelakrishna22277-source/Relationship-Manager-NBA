import { Loader2 } from "lucide-react";
export const LoadingState = ({
  message = "Loading banking intelligence...",
  size = "md"
}) => {
  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  };
  return <div
    role="status"
    aria-live="polite"
    className="flex flex-col items-center justify-center p-space-12 text-center rounded-radius-lg bg-color-7 border border-color-5 shadow-sm min-h-[220px]"
  >
      <Loader2 className={`${iconSizes[size]} text-color-2 animate-spin mb-space-3`} />
      <p className="text-text-sm font-medium text-color-1/80">{message}</p>
      <span className="sr-only">Loading</span>
    </div>;
};
