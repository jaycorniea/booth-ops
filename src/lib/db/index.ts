import { ensureInitialized, getStorageMode, sqlAll, sqlBatch, sqlBatchRead, sqlGet, sqlRun } from "../db-client";
import {
  type CaptainSlot,
  getCaptainSlotsForDate,
} from "../day-captain-slots";
import { sanitizeShiftRows } from "../e2e-artifacts";
import type { EventSettings } from "../event-settings";
import {
  ensureEventScheduleRows,
  ensureEventSettingsSchema,
  hydrateEventSettings,
  seedDefaultEventSettings,
  writeEventSettings,
} from "./event-settings";
import { padVolunteers } from "../shift-slots";
import { getActiveEventSettings } from "../event-settings";
import type {
  DayCaptainRow,
  Shift,
  ShiftVolunteer,
} from "./types";
export * from "./types";

export { getStorageMode };

export async function getEventSettings(): Promise<EventSettings> {
  await dbReady();
  return hydrateEventSettings();
}

export async function saveEventSettings(settings: EventSettings): Promise<void> {
  await dbReady();
  await writeEventSettings(settings);
  await ensureEventScheduleRows(settings);
}

const SCHEMA_VERSION = "2026-09-11-booth-ops-v1";

let schemaWarm = false;

async function bootstrapTables(): Promise<void> {
  const statements = SCHEMA_SQL.split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  if (statements.length) {
    await sqlBatch(statements.map((sql) => ({ sql })));
  }
}

async function getSchemaVersion(): Promise<string | null> {
  try {
    const row = await sqlGet<{ value: string }>(
      "SELECT value FROM sync_metadata WHERE key = ?",
      ["schema_version"]
    );
    return row?.value ?? null;
  } catch {
    return null;
  }
}

async function setSchemaVersion(version: string): Promise<void> {
  await sqlRun(
    `INSERT INTO sync_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    ["schema_version", version]
  );
}

async function initDb(): Promise<void> {
  const current = await getSchemaVersion();
  if (current === SCHEMA_VERSION) {
    schemaWarm = true;
    return;
  }
  await bootstrapTables();
  await seed();
  await setSchemaVersion(SCHEMA_VERSION);
  schemaWarm = true;
}

async function dbReady(): Promise<void> {
  if (!schemaWarm) {
    await ensureInitialized(initDb);
  }
  await hydrateEventSettings();
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS event_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    year INTEGER NOT NULL,
    open_date TEXT NOT NULL,
    close_date TEXT NOT NULL,
    setup_start_date TEXT NOT NULL DEFAULT '',
    setup_end_date TEXT NOT NULL DEFAULT '',
    captain_tools_open_date TEXT NOT NULL,
    split_captain_date TEXT NOT NULL DEFAULT '',
    booth_name TEXT NOT NULL,
    booth_location TEXT NOT NULL,
    booth_hours TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    timezone TEXT NOT NULL,
    official_slots_per_shift INTEGER NOT NULL,
    shift_templates_json TEXT NOT NULL,
    captain_split_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_date TEXT NOT NULL,
    shift_num INTEGER NOT NULL,
    checked_in INTEGER NOT NULL DEFAULT 0,
    no_show INTEGER NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    UNIQUE(event_date, shift_num)
  );

  CREATE TABLE IF NOT EXISTS shift_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_id INTEGER NOT NULL,
    slot_index INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    UNIQUE(shift_id, slot_index),
    FOREIGN KEY (shift_id) REFERENCES shifts(id)
  );

  CREATE TABLE IF NOT EXISTS day_captains (
    event_date TEXT NOT NULL,
    captain_slot TEXT NOT NULL DEFAULT 'full',
    name TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    PRIMARY KEY (event_date, captain_slot)
  );

  CREATE TABLE IF NOT EXISTS checklist_state (
    event_date TEXT NOT NULL,
    checklist_key TEXT NOT NULL,
    checked INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (event_date, checklist_key)
  );

  CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS kpi_snapshots (
    snapshot_date TEXT NOT NULL,
    metric TEXT NOT NULL,
    filled INTEGER NOT NULL,
    total INTEGER NOT NULL,
    percent REAL NOT NULL,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (snapshot_date, metric)
  );
`;

type ShiftRow = {
  id: number;
  event_date: string;
  shift_num: number;
  checked_in: number;
  no_show: number;
  notes: string;
};

type AssignmentRow = {
  shift_id: number;
  slot_index: number;
  name: string;
  phone: string;
  email: string;
};

function assembleShifts(shiftRows: ShiftRow[], assignments: AssignmentRow[]): Shift[] {
  const byShift = new Map<number, ShiftVolunteer[]>();
  for (const row of assignments) {
    const list = byShift.get(row.shift_id) ?? [];
    list.push({
      slot_index: row.slot_index,
      name: row.name ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
    });
    byShift.set(row.shift_id, list);
  }
  const slotCount = getActiveEventSettings().officialSlotsPerShift;
  return shiftRows.map((row) => ({
    id: row.id,
    event_date: row.event_date,
    shift_num: row.shift_num,
    volunteers: padVolunteers(byShift.get(row.id) ?? [], slotCount),
    checked_in: row.checked_in ?? 0,
    no_show: row.no_show ?? 0,
    notes: row.notes ?? "",
  }));
}

async function loadShifts(whereSql = "", args: (string | number)[] = []): Promise<Shift[]> {
  const shiftRows = await sqlAll<ShiftRow>(
    `SELECT id, event_date, shift_num, checked_in, no_show, notes FROM shifts ${whereSql} ORDER BY event_date, shift_num`,
    args
  );
  if (!shiftRows.length) return [];
  const ids = shiftRows.map((s) => s.id);
  const placeholders = ids.map(() => "?").join(", ");
  const assignments = await sqlAll<AssignmentRow>(
    `SELECT shift_id, slot_index, name, phone, email FROM shift_assignments WHERE shift_id IN (${placeholders}) ORDER BY slot_index`,
    ids
  );
  return sanitizeShiftRows(assembleShifts(shiftRows, assignments));
}

async function seedDemoVolunteers(): Promise<void> {
  const existing = await sqlGet<{ c: number }>(
    "SELECT COUNT(*) as c FROM shift_assignments WHERE name != ''"
  );
  if ((existing?.c ?? 0) > 0) return;

  const settings = getActiveEventSettings();
  const dates = [settings.openDate, settings.closeDate];
  const first = dates[0];
  if (!first) return;

  const shift1 = await sqlGet<ShiftRow>(
    "SELECT id, event_date, shift_num, checked_in, no_show, notes FROM shifts WHERE event_date = ? AND shift_num = 1",
    [first]
  );
  const shift2 = await sqlGet<ShiftRow>(
    "SELECT id, event_date, shift_num, checked_in, no_show, notes FROM shifts WHERE event_date = ? AND shift_num = 2",
    [first]
  );
  const day2 = await sqlGet<ShiftRow>(
    "SELECT id, event_date, shift_num, checked_in, no_show, notes FROM shifts WHERE event_date = ? AND shift_num = 1",
    [settings.openDate < settings.closeDate ? /* second day if any */ first : first]
  );
  void day2;

  const demo: { shift?: ShiftRow; slot: number; name: string; phone: string; email: string }[] = [];
  if (shift1) {
    demo.push(
      { shift: shift1, slot: 1, name: "Alex Rivera", phone: "555-0100", email: "alex@example.com" },
      { shift: shift1, slot: 2, name: "Jamie Chen", phone: "555-0101", email: "jamie@example.com" },
      { shift: shift1, slot: 3, name: "Sam Patel", phone: "555-0102", email: "sam@example.com" }
    );
  }
  if (shift2) {
    demo.push({
      shift: shift2,
      slot: 1,
      name: "Riley Brooks",
      phone: "555-0103",
      email: "riley@example.com",
    });
  }
  const mid = await sqlGet<ShiftRow>(
    "SELECT id, event_date, shift_num, checked_in, no_show, notes FROM shifts WHERE event_date > ? AND shift_num = 1 ORDER BY event_date LIMIT 1",
    [first]
  );
  if (mid) {
    demo.push({
      shift: mid,
      slot: 1,
      name: "Morgan Lee",
      phone: "555-0104",
      email: "morgan@example.com",
    });
  }

  for (const row of demo) {
    if (!row.shift) continue;
    await sqlRun(
      `UPDATE shift_assignments SET name = ?, phone = ?, email = ? WHERE shift_id = ? AND slot_index = ?`,
      [row.name, row.phone, row.email, row.shift.id, row.slot]
    );
  }
}

async function seed(): Promise<void> {
  await ensureEventSettingsSchema();
  await seedDefaultEventSettings();
  const settings = await hydrateEventSettings();
  await ensureEventScheduleRows(settings);
  await seedDemoVolunteers();
}

export async function listAllShifts(): Promise<Shift[]> {
  await dbReady();
  return loadShifts();
}

function dayCaptainsFromRows(eventDate: string, rows: DayCaptainRow[]): DayCaptainRow[] {
  const slots = getCaptainSlotsForDate(eventDate);
  const dayRows = rows.filter((r) => r.event_date === eventDate);
  return slots.map((cfg) => {
    const row = dayRows.find((r) => r.captain_slot === cfg.slot);
    if (row) return row;
    return {
      event_date: eventDate,
      captain_slot: cfg.slot,
      name: "",
      phone: "",
      email: "",
    };
  });
}

function parseChecklistRows(
  rows: { checklist_key: string; checked: number }[]
): Record<string, boolean> {
  return Object.fromEntries(rows.map((r) => [r.checklist_key, r.checked === 1]));
}

export type DayDashboardData = {
  shifts: Shift[];
  captains: DayCaptainRow[];
  checklist: Record<string, boolean>;
};

export async function getDayDashboardData(eventDate: string): Promise<DayDashboardData> {
  await dbReady();
  const [shiftRows, assignmentRows, captainRows, checklistRows] = await sqlBatchRead([
    {
      sql: "SELECT id, event_date, shift_num, checked_in, no_show, notes FROM shifts WHERE event_date = ? ORDER BY shift_num",
      args: [eventDate],
    },
    {
      sql: `SELECT a.shift_id, a.slot_index, a.name, a.phone, a.email
            FROM shift_assignments a
            JOIN shifts s ON s.id = a.shift_id
            WHERE s.event_date = ?
            ORDER BY a.shift_id, a.slot_index`,
      args: [eventDate],
    },
    { sql: "SELECT * FROM day_captains WHERE event_date = ? ORDER BY captain_slot", args: [eventDate] },
    {
      sql: "SELECT checklist_key, checked FROM checklist_state WHERE event_date = ?",
      args: [eventDate],
    },
  ]);
  return {
    shifts: sanitizeShiftRows(
      assembleShifts(shiftRows as unknown as ShiftRow[], assignmentRows as unknown as AssignmentRow[])
    ),
    captains: dayCaptainsFromRows(eventDate, captainRows as unknown as DayCaptainRow[]),
    checklist: parseChecklistRows(checklistRows as unknown as { checklist_key: string; checked: number }[]),
  };
}

export async function getShiftsForDate(eventDate: string): Promise<Shift[]> {
  await dbReady();
  return loadShifts("WHERE event_date = ?", [eventDate]);
}

export async function getShiftById(id: number): Promise<Shift | undefined> {
  await dbReady();
  const rows = await loadShifts("WHERE id = ?", [id]);
  return rows[0];
}

export async function getShiftCoverageSummary() {
  await dbReady();
  const shifts = await loadShifts();
  const byDate = new Map<string, Shift[]>();
  for (const shift of shifts) {
    const list = byDate.get(shift.event_date) ?? [];
    list.push(shift);
    byDate.set(shift.event_date, list);
  }
  return [...byDate.entries()].map(([event_date, dayShifts]) => ({
    event_date,
    total_shifts: dayShifts.length,
    filled_shifts: dayShifts.filter((s) => s.volunteers.some((v) => v.name.trim())).length,
  }));
}

export async function getSyncMetadata(key: string): Promise<string | null> {
  const bulk = await getSyncMetadataBulk([key]);
  return bulk[key] ?? null;
}

export async function getSyncMetadataBulk(keys: string[]): Promise<Record<string, string | null>> {
  if (!keys.length) return {};
  await dbReady();
  const placeholders = keys.map(() => "?").join(", ");
  const rows = await sqlAll<{ key: string; value: string }>(
    `SELECT key, value FROM sync_metadata WHERE key IN (${placeholders})`,
    keys
  );
  const out = Object.fromEntries(keys.map((key) => [key, null])) as Record<string, string | null>;
  for (const row of rows) {
    out[row.key] = row.value;
  }
  return out;
}

export async function setSyncMetadata(key: string, value: string) {
  await dbReady();
  await sqlRun(
    `INSERT INTO sync_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [key, value]
  );
}

export async function updateShift(
  id: number,
  patch: {
    volunteers?: ShiftVolunteer[];
    checked_in?: number;
    no_show?: number;
    notes?: string;
  }
) {
  await dbReady();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.checked_in != null) {
    fields.push("checked_in = ?");
    values.push(patch.checked_in);
  }
  if (patch.no_show != null) {
    fields.push("no_show = ?");
    values.push(patch.no_show);
  }
  if (patch.notes != null) {
    fields.push("notes = ?");
    values.push(patch.notes);
  }
  if (fields.length) {
    values.push(id);
    await sqlRun(`UPDATE shifts SET ${fields.join(", ")} WHERE id = ?`, values);
  }
  if (patch.volunteers) {
    const n = getActiveEventSettings().officialSlotsPerShift;
    const padded = padVolunteers(patch.volunteers, n);
    await sqlBatch(
      padded.map((v) => ({
        sql: `INSERT INTO shift_assignments (shift_id, slot_index, name, phone, email)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(shift_id, slot_index) DO UPDATE SET
                name = excluded.name,
                phone = excluded.phone,
                email = excluded.email`,
        args: [id, v.slot_index, v.name, v.phone, v.email],
      }))
    );
  }
}

export async function getDayCaptains(eventDate: string): Promise<DayCaptainRow[]> {
  await dbReady();
  const rows = await sqlAll<DayCaptainRow>(
    "SELECT * FROM day_captains WHERE event_date = ? ORDER BY captain_slot",
    [eventDate]
  );
  return dayCaptainsFromRows(eventDate, rows);
}

export async function getDayCaptain(eventDate: string): Promise<DayCaptainRow | undefined> {
  const captains = await getDayCaptains(eventDate);
  return captains.find((c) => c.name?.trim()) ?? captains[0];
}

export async function listDayCaptains(): Promise<DayCaptainRow[]> {
  await dbReady();
  return sqlAll<DayCaptainRow>("SELECT * FROM day_captains ORDER BY event_date, captain_slot");
}

export async function setDayCaptain(
  eventDate: string,
  captainSlot: CaptainSlot,
  name: string,
  phone: string,
  email = ""
) {
  await dbReady();
  await sqlRun(
    `INSERT INTO day_captains (event_date, captain_slot, name, phone, email)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(event_date, captain_slot) DO UPDATE SET
       name = excluded.name,
       phone = excluded.phone,
       email = excluded.email`,
    [eventDate, captainSlot, name, phone, email]
  );
}

export async function getChecklist(eventDate: string): Promise<Record<string, boolean>> {
  await dbReady();
  const rows = await sqlAll<{ checklist_key: string; checked: number }>(
    "SELECT checklist_key, checked FROM checklist_state WHERE event_date = ?",
    [eventDate]
  );
  return Object.fromEntries(rows.map((r) => [r.checklist_key, r.checked === 1]));
}

export async function setChecklistItem(eventDate: string, key: string, checked: boolean) {
  await dbReady();
  await sqlRun(
    `INSERT INTO checklist_state (event_date, checklist_key, checked) VALUES (?, ?, ?)
     ON CONFLICT(event_date, checklist_key) DO UPDATE SET checked = excluded.checked`,
    [eventDate, key, checked ? 1 : 0]
  );
}

export async function exportAllData() {
  await dbReady();
  const { listAuditLog } = await import("../audit-log");
  const [shifts, assignments, dayCaptains, auditLog] = await Promise.all([
    sqlAll("SELECT * FROM shifts ORDER BY event_date, shift_num"),
    sqlAll("SELECT * FROM shift_assignments ORDER BY shift_id, slot_index"),
    sqlAll("SELECT * FROM day_captains ORDER BY event_date, captain_slot"),
    listAuditLog(10_000),
  ]);
  return {
    shifts,
    assignments,
    dayCaptains,
    auditLog,
    exportedAt: new Date().toISOString(),
  };
}
