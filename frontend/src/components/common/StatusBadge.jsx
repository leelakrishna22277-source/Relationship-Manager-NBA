export const StatusBadge = ({ status, size = "sm" }) => {
  const norm = (status || "").toUpperCase();
  const getStyle = () => {
    switch (norm) {
      // NBA Statuses
      case "ACTIVE":
      case "PENDING":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "ACTIONED":
      case "CONVERTED":
      case "APPROVED":
      case "PASS":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "DISMISSED":
      case "REJECT":
      case "FAIL":
      case "NOT_INTERESTED":
        return "bg-red-50 text-red-700 border-red-200";
      case "UNDER_REVIEW":
      case "NEEDS_REVIEW":
      case "FOLLOW_UP_REQUIRED":
      case "HIGH":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "MEDIUM":
      case "MODERATE":
      case "INTERESTED":
        return "bg-sky-50 text-sky-800 border-sky-200";
      case "LOW":
      case "CONSERVATIVE":
      case "DRAFT":
      case "SAVED":
      case "NO_RESPONSE":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "PREMIER":
      case "WEALTH":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "HNI":
        return "bg-amber-50 text-amber-900 border-amber-300 font-bold";
      default:
        return "bg-color-6 text-color-1/70 border-color-5";
    }
  };
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-text-xs";
  return <span
    className={`inline-flex items-center font-medium rounded-full border ${sizeClasses} ${getStyle()}`}
  >
      {norm === "PENDING" ? "ACTIVE" : status ? status.replace(/_/g, " ") : "\u2014"}
    </span>;
};
