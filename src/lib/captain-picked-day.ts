import type { CaptainSlot } from "@/lib/day-captain-slots";
import { isEventDate } from "@/lib/event-dates";
import { isDaySubpageSegment } from "@/lib/day-routes";

/** Browser cookie (`dc_captain_picked_day`) — last event day dashboard this captain session opened on this device. */
export const CAPTAIN_PICKED_DAY_COOKIE = "dc_captain_picked_day";

export const CAPTAIN_PICKED_DAY_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 90,
  path: "/",
};

export function encodeCaptainPickedDayKey(date: string, captainSlot?: CaptainSlot): string {
  return captainSlot ? `${date}:${captainSlot}` : date;
}

export function parseCaptainPickedDayKey(
  key: string | undefined | null
): { date: string; captainSlot?: CaptainSlot } | null {
  if (!key?.trim()) return null;
  const trimmed = key.trim();
  const colon = trimmed.indexOf(":");
  if (colon === -1) return { date: trimmed };
  const date = trimmed.slice(0, colon);
  const slot = trimmed.slice(colon + 1);
  if (slot === "am" || slot === "pm") return { date, captainSlot: slot };
  return { date: trimmed };
}

/** Dashboard paths only — not eod. */
export function captainPickedDayKeyFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/day\/(\d{4}-\d{2}-\d{2})(?:\/([^/]+))?\/?$/);
  if (!match) return null;
  const [, date, segment] = match;
  if (!date || !isEventDate(date)) return null;
  if (!segment) return date;
  if (segment === "am" || segment === "pm") return encodeCaptainPickedDayKey(date, segment);
  if (isDaySubpageSegment(segment)) return null;
  return null;
}
