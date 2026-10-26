import { getEventClose, getEventEveDate, getEventOpen } from "@/lib/event-dates";
import { getActiveEventSettings } from "@/lib/event-settings";
import { getBoothConfig, type LiveAnchor } from "@/lib/booth-config";
import { localTimeToUtc } from "@/lib/portal-time";

export type PortalWindow = "a" | "b" | "c" | "d";

export type PortalWindowMeta = {
  code: string;
  label: string;
  summary: string;
};

export const PORTAL_WINDOW_META: Record<PortalWindow, PortalWindowMeta> = {
  a: {
    code: "A",
    label: "Before captain tools open",
    summary: "Coordinators recruit day captains; captains see a waiting state.",
  },
  b: {
    code: "B",
    label: "Fill the schedule",
    summary: "Captains enter volunteers on the shift sheet.",
  },
  c: {
    code: "C",
    label: "Booth is live",
    summary: "Booth is live; use coordinator contact for shift gaps; check-in on the shift sheet.",
  },
  d: {
    code: "D",
    label: "Event closed",
    summary: "Captains locked out; admin handles post-event portal work.",
  },
};

function parseLocalTime(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(":").map(Number);
  return { hour: h || 0, minute: m || 0 };
}

function resolveAnchorDate(anchor: LiveAnchor): string {
  if (anchor.relativeTo === "eveOfOpen") return getEventEveDate();
  if (anchor.relativeTo === "openDate") return getEventOpen();
  return getEventClose();
}

function anchorToUtc(anchor: LiveAnchor): Date {
  const date = resolveAnchorDate(anchor);
  const { hour, minute } = parseLocalTime(anchor.localTime);
  return localTimeToUtc(date, hour, minute, 0);
}

export function getWindowBStartUtc(): Date {
  const open = getActiveEventSettings().captainToolsOpenDate;
  return localTimeToUtc(open, 0, 0, 0);
}

export function getEventLiveWindowStartUtc(): Date {
  return anchorToUtc(getBoothConfig().lifecycle.liveStart);
}

export function getEventLiveWindowEndUtc(): Date {
  return anchorToUtc(getBoothConfig().lifecycle.liveEnd);
}

export function getPortalWindow(asOf = new Date()): PortalWindow {
  const t = asOf.getTime();
  if (t < getWindowBStartUtc().getTime()) return "a";
  if (t < getEventLiveWindowStartUtc().getTime()) return "b";
  if (t < getEventLiveWindowEndUtc().getTime()) return "c";
  return "d";
}

export function isCaptainLockedOut(asOf = new Date()): boolean {
  return getPortalWindow(asOf) === "d";
}

export function captainCanUseDayTools(asOf = new Date()): boolean {
  const window = getPortalWindow(asOf);
  return window === "b" || window === "c";
}

export function isEventLiveWindow(asOf = new Date()): boolean {
  return getPortalWindow(asOf) === "c";
}

export function isSignupVolunteersWindow(asOf = new Date()): boolean {
  return getPortalWindow(asOf) === "b";
}
