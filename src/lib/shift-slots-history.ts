import {
  listShiftAuditLogAsc,
  parseAuditChanges,
  type AuditLogEntry,
  type FieldChange,
} from "./audit-log";
import { getShiftsForDate, type Shift } from "./db";
import { getEventDates, hasVolunteer } from "./event-dates";
import { countShiftSlots, listShiftSlotsSnapshots, type KpiSnapshotRow } from "./kpi-snapshots";
import { centralDateFromSqliteUtc, centralDateString } from "./portal-time";

interface SlotNames {
  names: string[];
}

type SlotState = Map<string, SlotNames>;

export interface ShiftSlotsEventPoint {
  recordedAt: string;
  snapshotDate: string;
  filled: number;
  total: number;
  percent: number;
}

export interface ShiftSlotsDailyBar {
  snapshotDate: string;
  filled: number;
  total: number;
  percent: number;
  deltaFilled: number | null;
  changes: number;
  source: "audit" | "carried" | "current" | "snapshot";
}

export interface ShiftSlotsHistorySummary {
  daily: ShiftSlotsDailyBar[];
  auditChangeCount: number;
  sourceLabel: string;
}

function percent(filled: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((filled / total) * 1000) / 10;
}

function initSlotState(shifts: Shift[]): { state: SlotState; shiftIds: Set<string> } {
  const state: SlotState = new Map();
  const shiftIds = new Set<string>();
  for (const shift of shifts) {
    const id = String(shift.id);
    shiftIds.add(id);
    state.set(id, {
      names: shift.volunteers.map((v) => v.name ?? ""),
    });
  }
  return { state, shiftIds };
}

export function countFilledFromSlotState(
  state: SlotState,
  shiftIds: Set<string>
): { filled: number; total: number } {
  let filled = 0;
  let total = 0;
  for (const id of shiftIds) {
    const slot = state.get(id);
    if (!slot) continue;
    total += slot.names.length;
    filled += slot.names.filter((name) => hasVolunteer(name)).length;
  }
  return { filled, total };
}

function hasVolunteerFieldChange(changes: Record<string, FieldChange>): boolean {
  return Object.keys(changes).some(
    (field) => field === "name" || field.endsWith("_name") || field === "volunteers"
  );
}

export function applyShiftVolunteerAudit(
  state: SlotState,
  entityId: string,
  changes: Record<string, FieldChange>,
  direction: "forward" | "backward"
): boolean {
  const slot = state.get(entityId);
  if (!slot) return false;

  let touched = false;
  for (const [field, change] of Object.entries(changes)) {
    if (!field.endsWith("_name") && field !== "name") continue;
    const raw = direction === "forward" ? change.to : change.from;
    if (raw === undefined) continue;
    const indexMatch = /(?:slot_|vol)(\d+)_name/.exec(field);
    const index = indexMatch ? Number(indexMatch[1]) - 1 : 0;
    if (index >= 0) {
      slot.names[index] = String(raw);
      touched = true;
    }
  }
  return touched;
}

export function replayShiftVolunteerEvents(
  shifts: Shift[],
  audits: AuditLogEntry[]
): ShiftSlotsEventPoint[] {
  const { state, shiftIds } = initSlotState(shifts);
  const volunteerAudits = audits.filter((entry) => {
    const changes = parseAuditChanges(entry.changes);
    return hasVolunteerFieldChange(changes);
  });

  if (volunteerAudits.length === 0) {
    return [];
  }

  for (const entry of [...volunteerAudits].reverse()) {
    applyShiftVolunteerAudit(state, entry.entity_id, parseAuditChanges(entry.changes), "backward");
  }

  const events: ShiftSlotsEventPoint[] = [];
  for (const entry of volunteerAudits) {
    const changes = parseAuditChanges(entry.changes);
    if (!applyShiftVolunteerAudit(state, entry.entity_id, changes, "forward")) continue;
    const { filled, total } = countFilledFromSlotState(state, shiftIds);
    events.push({
      recordedAt: entry.created_at,
      snapshotDate: centralDateFromSqliteUtc(entry.created_at),
      filled,
      total,
      percent: percent(filled, total),
    });
  }

  return events;
}

function enumerateDates(start: string, end: string): string[] {
  const dates: string[] = [];
  let current = start;
  while (current <= end) {
    dates.push(current);
    const next = new Date(`${current}T12:00:00`);
    next.setDate(next.getDate() + 1);
    current = next.toISOString().slice(0, 10);
  }
  return dates;
}

export function buildDailyBarsFromEvents(
  events: ShiftSlotsEventPoint[],
  today: string,
  current: { filled: number; total: number },
  snapshots: KpiSnapshotRow[] = []
): ShiftSlotsDailyBar[] {
  const changesByDay = new Map<string, number>();
  const endOfDayFilled = new Map<string, number>();
  const snapshotByDay = new Map(snapshots.map((row) => [row.snapshotDate, row]));

  for (const event of events) {
    changesByDay.set(event.snapshotDate, (changesByDay.get(event.snapshotDate) ?? 0) + 1);
    endOfDayFilled.set(event.snapshotDate, event.filled);
  }

  // KPI snapshots are measured end-of-day fills. Audit replay only reconstructs absolute
  // counts when every roster change was audited — bulk imports/renames leave most volunteers
  // present for the entire reverse/forward walk, so intermediate fills spike toward "now".
  // Prefer snapshots whenever any exist; fall back to audit fills only with no snapshots.
  const hasSnapshots = snapshots.length > 0;
  const useAuditFills = !hasSnapshots && events.length > 0;

  const startCandidates = [
    useAuditFills ? events[0]?.snapshotDate : undefined,
    snapshots[0]?.snapshotDate,
  ].filter((date): date is string => Boolean(date));
  const start = startCandidates.length > 0 ? startCandidates.reduce((a, b) => (a < b ? a : b)) : today;
  const dates = enumerateDates(start, today);
  let lastFilled = 0;
  let lastTotal = current.total;
  let priorFilled: number | null = null;
  const daily: ShiftSlotsDailyBar[] = [];

  for (const snapshotDate of dates) {
    const changes = changesByDay.get(snapshotDate) ?? 0;
    let source: ShiftSlotsDailyBar["source"] = "carried";
    const snap = snapshotByDay.get(snapshotDate);

    if (snapshotDate === today) {
      // Always show live roster on the final bar (snapshot may be stale same-day).
      lastFilled = current.filled;
      lastTotal = current.total;
      source = snap && snap.filled === current.filled ? "snapshot" : "current";
    } else if (snap) {
      lastFilled = snap.filled;
      lastTotal = snap.total;
      source = "snapshot";
    } else if (useAuditFills && endOfDayFilled.has(snapshotDate)) {
      lastFilled = endOfDayFilled.get(snapshotDate)!;
      source = "audit";
    }

    const total = snapshotDate === today ? current.total : (snap?.total ?? lastTotal);
    const deltaFilled = priorFilled === null ? null : lastFilled - priorFilled;
    daily.push({
      snapshotDate,
      filled: lastFilled,
      total,
      percent: percent(lastFilled, total),
      deltaFilled,
      changes,
      source,
    });
    priorFilled = lastFilled;
  }

  if (daily.length === 0) {
    daily.push({
      snapshotDate: today,
      filled: current.filled,
      total: current.total,
      percent: percent(current.filled, current.total),
      deltaFilled: null,
      changes: 0,
      source: "current",
    });
  }

  return redistributeTrailingCurrentGap(daily);
}

/**
 * When measured days stop and a run of carried days ends at "current" with a different
 * fill count, spread the change across the gap. Avoids a false one-day cliff when daily
 * KPI snapshots were not recorded for a stretch (common on a stale local DB).
 */
export function redistributeTrailingCurrentGap(daily: ShiftSlotsDailyBar[]): ShiftSlotsDailyBar[] {
  if (daily.length < 2) return daily;
  const last = daily[daily.length - 1];
  if (last.source !== "current") return daily;

  let lastMeasured = -1;
  for (let i = daily.length - 2; i >= 0; i--) {
    if (daily[i].source === "snapshot" || daily[i].source === "audit") {
      lastMeasured = i;
      break;
    }
    if (daily[i].source !== "carried") return daily;
  }
  if (lastMeasured < 0) return daily;

  const gapStart = lastMeasured + 1;
  // Need a multi-day hole (2+ carried days) before the final "current" bar.
  // A single quiet day before a real same-day recruitment jump is left alone.
  const carriedCount = daily.length - lastMeasured - 2;
  if (carriedCount < 2) return daily;
  for (let i = gapStart; i < daily.length - 1; i++) {
    if (daily[i].source !== "carried") return daily;
  }

  const startFilled = daily[lastMeasured].filled;
  const endFilled = last.filled;
  if (startFilled === endFilled) return daily;

  const steps = daily.length - 1 - lastMeasured;
  const result = daily.map((row) => ({ ...row }));
  let prior = startFilled;
  for (let step = 1; step <= steps; step++) {
    const idx = lastMeasured + step;
    const filled = Math.round(startFilled + ((endFilled - startFilled) * step) / steps);
    const total = result[idx].total;
    result[idx] = {
      ...result[idx],
      filled,
      percent: percent(filled, total),
      deltaFilled: filled - prior,
      source: step === steps ? "current" : "carried",
    };
    prior = filled;
  }
  // Recompute delta on the first redistributed day relative to last measured.
  if (gapStart < result.length) {
    result[gapStart] = {
      ...result[gapStart],
      deltaFilled: result[gapStart].filled - startFilled,
    };
  }
  return result;
}

export async function buildShiftSlotsDailyHistory(
  today = centralDateString()
): Promise<ShiftSlotsHistorySummary> {
  const eventDates = getEventDates();
  const allShifts = (await Promise.all(eventDates.map((d) => getShiftsForDate(d)))).flat();
  const currentCounts = countShiftSlots(allShifts);
  const [audits, snapshots] = await Promise.all([
    listShiftAuditLogAsc(),
    listShiftSlotsSnapshots(),
  ]);
  const events = replayShiftVolunteerEvents(allShifts, audits);
  const volunteerAuditCount = audits.filter((entry) =>
    hasVolunteerFieldChange(parseAuditChanges(entry.changes))
  ).length;

  return {
    daily: buildDailyBarsFromEvents(events, today, currentCounts, snapshots),
    auditChangeCount: volunteerAuditCount,
    sourceLabel: "daily KPI snapshots for filled counts; audit log for roster-edit counts",
  };
}