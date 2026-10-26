export type PortalAlertSeverity = "critical" | "high" | "watch" | "info";

export type PortalAlertCategory =
  | "event.shift_slot_opened"
  | "event.no_show"
  | "event.issue_logged";

export interface PortalAlert {
  id: string;
  severity: PortalAlertSeverity;
  category: PortalAlertCategory;
  title: string;
  detail: string;
  href: string;
  at: string;
  dedupeKey: string;
}

export type PortalAlertsSeverityFilter = "all" | "actionable" | PortalAlertSeverity;

export interface PortalAlertsQuery {
  severity: PortalAlertsSeverityFilter;
}

const SEVERITY_RANK: Record<PortalAlertSeverity, number> = {
  critical: 0,
  high: 1,
  watch: 2,
  info: 3,
};

export const PORTAL_ALERT_SEVERITY_LABEL: Record<PortalAlertSeverity, string> = {
  critical: "Critical",
  high: "High",
  watch: "Watch",
  info: "Info",
};

export function parsePortalAlertsQuery(
  params: Record<string, string | string[] | undefined>
): PortalAlertsQuery {
  const raw = typeof params.severity === "string" ? params.severity : "actionable";
  const severity: PortalAlertsSeverityFilter =
    raw === "all" ||
    raw === "critical" ||
    raw === "high" ||
    raw === "watch" ||
    raw === "info"
      ? raw
      : "actionable";
  return { severity };
}

export function sortPortalAlerts(alerts: PortalAlert[]): PortalAlert[] {
  return [...alerts].sort((a, b) => {
    const rank = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (rank !== 0) return rank;
    return b.at.localeCompare(a.at);
  });
}

export function dedupePortalAlerts(alerts: PortalAlert[]): PortalAlert[] {
  return sortPortalAlerts(alerts);
}

export function filterPortalAlerts(
  alerts: PortalAlert[],
  query: PortalAlertsQuery
): PortalAlert[] {
  if (query.severity === "all") return alerts;
  if (query.severity === "actionable") {
    return alerts.filter(
      (a) => a.severity === "critical" || a.severity === "high" || a.severity === "watch"
    );
  }
  return alerts.filter((a) => a.severity === query.severity);
}

export function summarizePortalAlerts(alerts: PortalAlert[]): Record<PortalAlertSeverity, number> {
  return alerts.reduce(
    (acc, alert) => {
      acc[alert.severity] += 1;
      return acc;
    },
    { critical: 0, high: 0, watch: 0, info: 0 }
  );
}