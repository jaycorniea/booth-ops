import { getShiftsForDate, type Shift } from "./db";
import { getEventDates, hasVolunteer } from "./event-dates";
import { sqlAll, sqlRun } from "./db-client";
import { centralDateString } from "./portal-time";
import { officialSlotsPerShift } from "./shift-slots";

export const SHIFT_SLOTS_METRIC = "shift_slots";

export interface KpiSnapshotRow {
  snapshotDate: string;
  filled: number;
  total: number;
  percent: number;
  recordedAt: string;
}

let schemaReady = false;

export function countShiftSlots(shifts: Shift[]): { filled: number; total: number } {
  const perShift = officialSlotsPerShift();
  let filled = 0;
  for (const shift of shifts) {
    filled += shift.volunteers.filter((v) => hasVolunteer(v.name)).length;
  }
  return { filled, total: shifts.length * perShift };
}

function percent(filled: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((filled / total) * 1000) / 10;
}

export async function ensureKpiSnapshotSchema(): Promise<void> {
  if (schemaReady) return;
  await sqlRun(`
    CREATE TABLE IF NOT EXISTS kpi_snapshots (
      snapshot_date TEXT NOT NULL,
      metric TEXT NOT NULL,
      filled INTEGER NOT NULL,
      total INTEGER NOT NULL,
      percent REAL NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (snapshot_date, metric)
    )
  `);
  await sqlRun(
    "CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_metric_date ON kpi_snapshots(metric, snapshot_date DESC)"
  );
  schemaReady = true;
}

export async function upsertShiftSlotsSnapshot(
  filled: number,
  total: number,
  snapshotDate = centralDateString()
): Promise<void> {
  await ensureKpiSnapshotSchema();
  await sqlRun(
    `INSERT INTO kpi_snapshots (snapshot_date, metric, filled, total, percent, recorded_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(snapshot_date, metric) DO UPDATE SET
       filled = excluded.filled,
       total = excluded.total,
       percent = excluded.percent,
       recorded_at = excluded.recorded_at`,
    [snapshotDate, SHIFT_SLOTS_METRIC, filled, total, percent(filled, total)]
  );
}

export async function listShiftSlotsSnapshots(): Promise<KpiSnapshotRow[]> {
  await ensureKpiSnapshotSchema();
  return sqlAll<KpiSnapshotRow>(
    `SELECT snapshot_date AS snapshotDate, filled, total, percent, recorded_at AS recordedAt
     FROM kpi_snapshots
     WHERE metric = ?
     ORDER BY snapshot_date ASC`,
    [SHIFT_SLOTS_METRIC]
  );
}

export async function computeEventShiftSlotTotals(): Promise<{ filled: number; total: number }> {
  const eventDates = getEventDates();
  const allShifts = await Promise.all(eventDates.map((d) => getShiftsForDate(d)));
  let filled = 0;
  let total = 0;
  for (const shifts of allShifts) {
    const counts = countShiftSlots(shifts);
    filled += counts.filled;
    total += counts.total;
  }
  return { filled, total };
}

export async function refreshShiftSlotsKpiSnapshot(
  snapshotDate = centralDateString()
): Promise<void> {
  const { filled, total } = await computeEventShiftSlotTotals();
  await upsertShiftSlotsSnapshot(filled, total, snapshotDate);
}
