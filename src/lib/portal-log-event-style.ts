import type { PortalTimelineEntry } from "./portal-activity";

export const PORTAL_LOG_KIND_LABEL: Record<PortalTimelineEntry["kind"], string> = {
  page: "Nav",
  change: "Activity",
};

export function portalLogKindChipClass(kind: PortalTimelineEntry["kind"]): string {
  return kind === "page"
    ? "rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-900"
    : "rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-950";
}

export function portalLogKindRowClass(kind: PortalTimelineEntry["kind"]): string {
  return kind === "page"
    ? "rounded-md border border-sky-200 bg-sky-50/60 px-2.5 py-1.5 text-sm"
    : "rounded-md border border-amber-200 bg-amber-50/70 px-2.5 py-1.5 text-sm";
}

export const PORTAL_LOG_NAV_COUNT = "tabular-nums font-medium text-sky-800";
export const PORTAL_LOG_ACTIVITY_COUNT = "tabular-nums font-medium text-amber-900";
export const PORTAL_LOG_NAV_HEADER = "whitespace-nowrap text-sky-700";
export const PORTAL_LOG_ACTIVITY_HEADER = "whitespace-nowrap text-amber-800";
