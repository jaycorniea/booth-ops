import { parseAuditChanges, type AuditLogEntry } from "./audit-log";
import type { PortalAlert } from "./alerts-types";
import { dayDashboardHref } from "./day-routes";
import {
  formatEventDate,
  formatShiftLabel,
  getShiftScheduleEntry,
  hasVolunteer,
} from "./event-dates";
import { centralDateString } from "./portal-time";
import { isE2eAuditEntry } from "./e2e-artifacts";

function isEventShiftNum(n: number): boolean {
  return Number.isInteger(n) && Boolean(getShiftScheduleEntry(n));
}

function shiftSlotLabel(eventDate: string, shiftNum: number | null): string {
  if (shiftNum && isEventShiftNum(shiftNum)) {
    return `${formatEventDate(eventDate)} · ${formatShiftLabel(shiftNum)}`;
  }
  return formatEventDate(eventDate);
}

function exposureSeverity(today: string, eventDate: string | null): PortalAlert["severity"] {
  if (!eventDate) return "high";
  if (eventDate === today) return "critical";
  const from = new Date(`${today}T12:00:00`);
  const to = new Date(`${eventDate}T12:00:00`);
  const daysOut = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  if (daysOut >= 0 && daysOut <= 2) return "high";
  if (daysOut >= 0 && daysOut <= 7) return "watch";
  return "watch";
}

function parseEventShiftNum(raw: string): number | null {
  const num = Number(raw);
  return isEventShiftNum(num) ? num : null;
}

function parseShiftNumFromEntityId(entityId: string, eventDate: string | null): number | null {
  if (eventDate) {
    const match = entityId.match(new RegExp(`^${eventDate}:(\\d+)$`));
    if (match) return parseEventShiftNum(match[1]);
  }
  return parseEventShiftNum(entityId);
}

function parseShiftNumFromSummary(summary: string): number | null {
  const match = summary.match(/\bshift\s+([1-6])\b/i);
  return match ? parseEventShiftNum(match[1]) : null;
}

function resolveShiftNum(entry: AuditLogEntry): number | null {
  return (
    parseShiftNumFromEntityId(entry.entity_id, entry.event_date) ??
    parseShiftNumFromSummary(entry.summary)
  );
}

export function alertsFromAuditEvents(
  entries: AuditLogEntry[],
  sinceUtc: string,
  today = centralDateString()
): PortalAlert[] {
  const alerts: PortalAlert[] = [];

  for (const entry of entries) {
    if (entry.created_at < sinceUtc) continue;
    if (isE2eAuditEntry(entry)) continue;

    if (entry.entity_type !== "shift" || entry.operation !== "update") continue;

    const changes = parseAuditChanges(entry.changes);
    const eventDate = entry.event_date;
    const shiftNum = resolveShiftNum(entry);

    if (changes.no_show?.to === 1 || changes.no_show?.to === "1") {
      const label = eventDate ? shiftSlotLabel(eventDate, shiftNum) : "a shift";
      alerts.push({
        id: `event:no_show:${entry.id}`,
        severity: exposureSeverity(today, eventDate),
        category: "event.no_show",
        title: `No-show — shift slot opened up · ${label}`,
        detail: "Volunteer marked no-show — roster slot needs coverage.",
        href: eventDate ? dayDashboardHref(eventDate) : "/schedule",
        at: entry.created_at,
        dedupeKey: `event:no_show:${entry.id}`,
      });
      continue;
    }

    for (const field of ["vol1_name", "vol2_name"] as const) {
      const change = changes[field];
      if (!change) continue;
      if (!hasVolunteer(String(change.from ?? "")) || hasVolunteer(String(change.to ?? ""))) {
        continue;
      }
      const label = eventDate ? shiftSlotLabel(eventDate, shiftNum) : "a shift";
      alerts.push({
        id: `event:shift_opened:${entry.id}:${field}`,
        severity: exposureSeverity(today, eventDate),
        category: "event.shift_slot_opened",
        title: `Shift slot opened up · ${label}`,
        detail: `${field === "vol1_name" ? "Volunteer 1" : "Volunteer 2"} cleared from roster — slot needs coverage.`,
        href: eventDate ? dayDashboardHref(eventDate) : "/schedule",
        at: entry.created_at,
        dedupeKey: `event:shift_opened:${entry.id}:${field}`,
      });
    }
  }

  return alerts;
}