import {
  type CaptainSlot,
  getCaptainSlotsForDate,
  isSplitCaptainDay,
} from "@/lib/day-captain-slots";
import { isEventDate } from "@/lib/event-dates";
import { notFound } from "next/navigation";

/** Path segments reserved for day subpages (not captain half-day dashboards). */
export const DAY_SUBPAGE_SEGMENTS = ["eod"] as const;

export function isDaySubpageSegment(segment: string): boolean {
  return (DAY_SUBPAGE_SEGMENTS as readonly string[]).includes(segment);
}

export function isSplitCaptainPathSlot(slot: string): slot is "am" | "pm" {
  return slot === "am" || slot === "pm";
}

/** Dashboard URL — split event days use `/day/{date}/am` or `/day/{date}/pm`. */
export function dayDashboardHref(eventDate: string, captainSlot?: CaptainSlot): string {
  if (isSplitCaptainDay(eventDate)) {
    const slot = captainSlot === "pm" ? "pm" : "am";
    return `/day/${eventDate}/${slot}`;
  }
  return `/day/${eventDate}`;
}

export type DaySubpageSegment = (typeof DAY_SUBPAGE_SEGMENTS)[number];

/** EOD (and legacy subpages) under `/day/{date}/…`. */
export function daySubpageHref(eventDate: string, segment: DaySubpageSegment): string {
  return `/day/${eventDate}/${segment}`;
}

/** Paths to revalidate after day dashboard data changes. */
export function dayDashboardRevalidatePaths(eventDate: string): string[] {
  if (isSplitCaptainDay(eventDate)) {
    return [`/day/${eventDate}`, `/day/${eventDate}/am`, `/day/${eventDate}/pm`];
  }
  return [`/day/${eventDate}`];
}

/** 404 for dates outside the event calendar (incl. removed setup days). */
export function assertEventDate(eventDate: string): void {
  if (!isEventDate(eventDate)) notFound();
}