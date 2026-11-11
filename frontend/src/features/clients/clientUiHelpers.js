export const getInitials = (name) => {
  if (!name) return "CL";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
export const getSegmentConfig = (seg) => {
  const norm = (seg || "").toUpperCase();
  switch (norm) {
    case "HNI":
      return {
        badge: "bg-amber-50 text-amber-900 border-amber-300 font-bold",
        avatarGradient: "from-amber-600 to-amber-800 text-white shadow-xs",
        label: "HNI Wealth"
      };
    case "WEALTH":
      return {
        badge: "bg-purple-50 text-purple-700 border-purple-200 font-semibold",
        avatarGradient: "from-purple-600 to-indigo-800 text-white shadow-xs",
        label: "Private Wealth"
      };
    case "PREMIER":
      return {
        badge: "bg-blue-50 text-blue-700 border-blue-200 font-semibold",
        avatarGradient: "from-color-2 to-blue-700 text-white shadow-xs",
        label: "Premier"
      };
    default:
      return {
        badge: "bg-slate-100 text-slate-700 border-slate-200 font-medium",
        avatarGradient: "from-slate-600 to-slate-800 text-white shadow-xs",
        label: norm || "Retail"
      };
  }
};
export const getRiskConfig = (risk) => {
  const norm = (risk || "").toUpperCase();
  if (norm === "LOW" || norm === "CONSERVATIVE") {
    return {
      dot: "bg-emerald-500",
      label: "Low",
      badge: "bg-emerald-50 text-emerald-800 border-emerald-200"
    };
  }
  if (norm === "HIGH" || norm === "AGGRESSIVE") {
    return {
      dot: "bg-amber-500",
      label: "High",
      badge: "bg-amber-50 text-amber-800 border-amber-200"
    };
  }
  return {
    dot: "bg-sky-500",
    label: "Moderate",
    badge: "bg-sky-50 text-sky-800 border-sky-200"
  };
};
