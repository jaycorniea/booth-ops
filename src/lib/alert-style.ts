import type { PortalAlertSeverity } from "./alerts";

export const ALERT_SEVERITY_BORDER: Record<PortalAlertSeverity, string> = {
  critical: "border-l-red-500 bg-red-50/50",
  high: "border-l-amber-500 bg-amber-50/40",
  watch: "border-l-yellow-400 bg-yellow-50/35",
  info: "border-l-sky-400 bg-slate-50/80",
};

export const ALERT_SEVERITY_BADGE: Record<PortalAlertSeverity, string> = {
  critical: "bg-red-100 text-red-900",
  high: "bg-amber-100 text-amber-950",
  watch: "bg-yellow-100 text-yellow-900",
  info: "bg-sky-100 text-sky-900",
};

export const ALERT_SEVERITY_DOT: Record<PortalAlertSeverity, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  watch: "bg-yellow-400",
  info: "bg-sky-400",
};