import { centralDateString } from "./portal-time";
import {
  listStoredPortalAlerts,
  syncPortalAlertsFromAudit,
} from "./portal-alerts-store";
import { sortPortalAlerts, type PortalAlert } from "./alerts-types";

export type {
  PortalAlert,
  PortalAlertCategory,
  PortalAlertsQuery,
  PortalAlertsSeverityFilter,
  PortalAlertSeverity,
} from "./alerts-types";
export {
  PORTAL_ALERT_SEVERITY_LABEL,
  dedupePortalAlerts,
  filterPortalAlerts,
  parsePortalAlertsQuery,
  sortPortalAlerts,
  summarizePortalAlerts,
} from "./alerts-types";

export { alertsFromAuditEvents } from "./alerts-from-audit";

export async function listPortalAlerts(today = centralDateString()): Promise<PortalAlert[]> {
  await syncPortalAlertsFromAudit(today);
  return sortPortalAlerts(await listStoredPortalAlerts(7));
}