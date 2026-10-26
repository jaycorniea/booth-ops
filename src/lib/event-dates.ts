import {
  addIsoDays,
  getActiveEventSettings,
  listEventDates,
} from "./event-settings";
import { getBoothConfig, type ShiftTemplate } from "./booth-config";

export function getEventOpen(): string {
  return getActiveEventSettings().openDate;
}

export function getEventClose(): string {
  return getActiveEventSettings().closeDate;
}

/** Calendar day before the event opens. */
export function getEventEveDate(): string {
  return addIsoDays(getEventOpen(), -1);
}

/** First day slot-fill stoplights use the tight 99/95 band (week before opening). */
export function getCoverageTightenDate(): string {
  return addIsoDays(getEventOpen(), -7);
}

export type ShiftScheduleEntry = ShiftTemplate & { label: string };

export function formatShiftTimeRange(start: string, end: string): string {
  const startLabel = start.endsWith(":00") ? start.slice(0, 5) : start;
  const endLabel = end.endsWith(":00") ? end.slice(0, 5) : end;
  return `${startLabel}–${endLabel}`;
}

export function getShiftSchedule(): ShiftScheduleEntry[] {
  return getActiveEventSettings().shiftTemplates.map((t) => ({
    ...t,
    label: formatShiftTimeRange(t.start, t.end),
  }));
}

export function getShiftScheduleEntry(shiftNum: number) {
  return getShiftSchedule().find((s) => s.num === shiftNum);
}

export function formatShiftLabel(shiftNum: number): string {
  const sched = getShiftScheduleEntry(shiftNum);
  return sched ? `${shiftNum}. ${sched.label}` : `Shift ${shiftNum}`;
}

export function formatScheduleDayTitle(iso: string): string {
  return formatEventDate(iso);
}

export function formatShiftOption(shiftNum: number): string {
  const sched = getShiftScheduleEntry(shiftNum);
  if (!sched) return `Shift ${shiftNum}`;
  const time = sched.label.replace(/–/g, "-");
  return `Shift ${shiftNum}: ${time}`;
}

export type EventPhase = "pre-event" | "during-event" | "post-event";

export function getEventPhase(today: string): EventPhase {
  if (today < getEventOpen()) return "pre-event";
  if (today > getEventClose()) return "post-event";
  return "during-event";
}

/** Calendar days until opening day (0 on opening day). */
export function daysUntilEventOpen(today: string): number {
  const open = new Date(`${getEventOpen()}T12:00:00`);
  const now = new Date(`${today}T12:00:00`);
  return Math.max(0, Math.ceil((open.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

/** 1-based index of today within the event, or 0 if outside event dates. */
export function eventDayNumber(today: string): number {
  const index = getEventDates().indexOf(today);
  return index >= 0 ? index + 1 : 0;
}

export function getEventDates(): string[] {
  return listEventDates(getActiveEventSettings());
}

/** Reorder items so a row-major CSS grid reads down each column. */
export function reorderForColumnMajorGrid<T>(items: readonly T[], columns = 2): T[] {
  if (columns < 2 || items.length < 2) return [...items];
  const rows = Math.ceil(items.length / columns);
  const result: T[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const index = col * rows + row;
      if (index < items.length) result.push(items[index]);
    }
  }
  return result;
}

export function isEventDate(iso: string): boolean {
  return getEventDates().includes(iso);
}

export function hasDayCaptain(captain: { name?: string | null } | null | undefined): boolean {
  return Boolean(captain?.name?.trim());
}

export function hasVolunteer(name?: string | null): boolean {
  return Boolean(name?.trim());
}

export const UNASSIGNED_CAPTAIN_DAY_CLASS =
  "border-red-200 bg-red-50/70 hover:border-red-300";

export const UNASSIGNED_SLOT_CLASS = "rounded-lg border border-red-200 bg-red-50/70 px-2 py-1.5";

export const UNASSIGNED_SLOT_TEXT_CLASS = "text-sm text-red-600/70 italic";

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatIsoDate(iso: string): string {
  const match = ISO_DATE_RE.exec(iso.trim());
  if (!match) return iso;
  return `${match[2]}-${match[3]}-${match[1]}`;
}

export function formatEventDate(iso: string): string {
  const match = ISO_DATE_RE.exec(iso.trim());
  if (!match) return iso;
  const d = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(getBoothConfig().org.locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Home page day cards — e.g. THU AUG 14 */
export function formatEventDayCard(iso: string): string {
  const match = ISO_DATE_RE.exec(iso.trim());
  if (!match) return iso;
  const d = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const weekday = d.toLocaleDateString(getBoothConfig().org.locale, { weekday: "short" }).toUpperCase();
  const month = d.toLocaleDateString(getBoothConfig().org.locale, { month: "short" }).toUpperCase();
  return `${weekday} ${month} ${d.getDate()}`;
}
