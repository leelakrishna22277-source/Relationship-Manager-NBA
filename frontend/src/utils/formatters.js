import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
export function formatCurrency(amount) {
  if (amount === null || amount === void 0 || isNaN(Number(amount))) {
    return "$0.00";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(amount));
}
export function formatDate(dateStr) {
  if (!dateStr) return "\u2014";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(d);
  } catch {
    return dateStr;
  }
}
export function formatBps(bps) {
  if (bps === null || bps === void 0) return "\u2014";
  return `${(bps / 100).toFixed(2)}%`;
}
export function formatPercent(rate) {
  if (rate === null || rate === void 0) return "0%";
  return `${(rate * 100).toFixed(1)}%`;
}
export function parseJwt(token) {
  if (!token || typeof token !== "string") return null;
  if (!token.includes(".")) {
    const isTl = token.includes("tl") || token.includes("lead");
    const isRm2 = token.includes("rm2") || token.includes("rm-2") || token.includes("priya");
    return {
      id: isTl ? "rm-tl-sarah" : isRm2 ? "rm-2" : "rm-1",
      name: isTl ? "Sarah Jenkins" : isRm2 ? "Priya Verma" : "Rajesh Kumar",
      email: isTl ? "tl.sarah@bank.com" : isRm2 ? "rm.priya@bank.com" : "rm.rajesh@bank.com",
      role: isTl ? "TEAM_LEAD" : "RM",
      team_id: isTl ? "team-lead-ops" : "team-wealth-1"
    };
  }
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const decoded = JSON.parse(jsonPayload);
    const role = decoded.role || (decoded.userId?.includes("tl") ? "TEAM_LEAD" : "RM");
    const isTl = role === "TEAM_LEAD";
    return {
      id: decoded.userId || decoded.id || (isTl ? "rm-tl-sarah" : "rm-1"),
      name: decoded.name || (isTl ? "Sarah Jenkins" : "Rajesh Kumar"),
      email: decoded.email || (isTl ? "tl.sarah@bank.com" : "rm.rajesh@bank.com"),
      role,
      team_id: decoded.team_id || (isTl ? "team-lead-ops" : "team-wealth-1")
    };
  } catch {
    return null;
  }
}
