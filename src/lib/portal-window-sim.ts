import type { PortalWindow } from "@/lib/portal-windows";
import { getPortalWindow } from "@/lib/portal-windows";
import { centralLocalTimeToUtc } from "@/lib/portal-time";

/** Admin-only cookie — simulates portal window A–D without changing system clock. */
export const PORTAL_WINDOW_SIM_COOKIE = "portal_window_sim";

export function parsePortalWindowSim(value: string | undefined | null): PortalWindow | null {
  if (value === "a" || value === "b" || value === "c" || value === "d") return value;
  return null;
}

/** Representative Central-time instant inside each window (for `getPortalWindow(asOf)`). */
export function sampleAsOfForPortalWindow(window: PortalWindow): Date {
  switch (window) {
    case "a":
      return centralLocalTimeToUtc("2026-05-15", 12, 0, 0);
    case "b":
      return centralLocalTimeToUtc("2026-07-15", 12, 0, 0);
    case "c":
      return centralLocalTimeToUtc("2026-08-14", 12, 0, 0);
    case "d":
      return centralLocalTimeToUtc("2026-08-20", 12, 0, 0);
  }
}

export function resolvePortalAsOf(sim: PortalWindow | null, realAsOf = new Date()): Date {
  return sim ? sampleAsOfForPortalWindow(sim) : realAsOf;
}

export function effectivePortalWindow(sim: PortalWindow | null, realAsOf = new Date()): PortalWindow {
  return sim ?? getPortalWindow(realAsOf);
}
