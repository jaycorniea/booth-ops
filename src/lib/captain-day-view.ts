import type { AuthRole } from "@/lib/auth-types";
import { getEventOpen, isEventDate } from "@/lib/event-dates";
import { isEventLiveWindow, isSignupVolunteersWindow } from "@/lib/portal-windows";

export function isCaptainDayView(role: AuthRole | null | undefined): boolean {
  return role === "captain";
}

export type CoordinatorContactStripMode = "signup" | "no-show" | "hidden";

/** Contact strip by portal window — Window B prep, Window C gap/no-show; hidden in A/D. */
export function captainDayContactStripMode(asOf = new Date()): CoordinatorContactStripMode {
  if (isSignupVolunteersWindow(asOf)) return "signup";
  if (isEventLiveWindow(asOf)) return "no-show";
  return "hidden";
}

/**
 * Shift check-in / no-show on the day dashboard — Window C, event days on or after opening day.
 * UI and toggles are admin-only; captains use the contact strip for gaps.
 */
export function captainDayShowsCheckIn(eventDate: string, asOf = new Date()): boolean {
  if (!isEventDate(eventDate) || eventDate < getEventOpen()) return false;
  return isEventLiveWindow(asOf);
}

/** @deprecated Alias of `captainDayShowsCheckIn` (EOD/close-out UI removed). */
export function captainDayShowsCloseOut(eventDate: string, asOf = new Date()): boolean {
  return captainDayShowsCheckIn(eventDate, asOf);
}
