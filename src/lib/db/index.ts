import { ensureInitialized, getStorageMode, sqlAll, sqlBatch, sqlBatchRead, sqlGet, sqlRun } from "../db-client";
import {
  type CaptainSlot,
  getCaptainSlotsForDate,
} from "../day-captain-slots";
import { sanitizeShiftRows } from "../e2e-artifacts";
import {
  occupantsByShift,
  shiftMatchForInterested,
  shouldUnplaceInterested,
} from "../unplace-cleared-shift";
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
import type { OnCallShiftRequest } from "../on-call-shift-requests";
import {
  isOnCallVolunteerStatus,
  ON_CALL_ACTIVE_STATUSES,
  type OnCallVolunteerStatus,
} from "../on-call-status";
import type {
  CaptainFeedback,
  DayCaptainRow,
  InterestedVolunteer,
  InterestedVolunteerStatus,
  Issue,
  OnCallVolunteer,
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

  CREATE TABLE IF NOT EXISTS on_call (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    availability TEXT DEFAULT '',
    notice_minutes INTEGER DEFAULT 45,
    available_dates TEXT DEFAULT 'any',
    available_shifts TEXT DEFAULT 'any',
    bilingual INTEGER NOT NULL DEFAULT 0,
    last_contacted TEXT DEFAULT '',
    contacted_event_date TEXT DEFAULT '',
    contacted_shift_num INTEGER,
    status TEXT NOT NULL DEFAULT 'approved',
    placed_event_date TEXT DEFAULT '',
    placed_shift_num INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS on_call_shift_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    on_call_id INTEGER NOT NULL,
    event_date TEXT NOT NULL,
    shift_num INTEGER NOT NULL,
    contacted_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS interested_volunteers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    source TEXT DEFAULT '',
    available_dates TEXT DEFAULT 'any',
    available_shifts TEXT DEFAULT 'any',
    bilingual INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'interested',
    placed_event_date TEXT DEFAULT '',
    placed_shift_num INTEGER,
    last_contacted TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS day_captains (
    event_date TEXT NOT NULL,
    captain_slot TEXT NOT NULL DEFAULT 'full',
    name TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    PRIMARY KEY (event_date, captain_slot)
  );

  CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_date TEXT NOT NULL,
    shift TEXT DEFAULT '',
    category TEXT NOT NULL DEFAULT 'visitor',
    description TEXT NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0,
    admin_response TEXT DEFAULT '',
    admin_response_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

  CREATE TABLE IF NOT EXISTS captain_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT DEFAULT '',
    email TEXT DEFAULT '',
    event_date TEXT DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general',
    portal_rating INTEGER,
    comments TEXT NOT NULL,
    admin_response TEXT DEFAULT '',
    admin_response_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

  const interestedCount = await sqlGet<{ c: number }>("SELECT COUNT(*) as c FROM interested_volunteers");
  if ((interestedCount?.c ?? 0) === 0) {
    await sqlRun(
      `INSERT INTO interested_volunteers (
        name, phone, email, notes, source, available_dates, available_shifts, bilingual, status
      ) VALUES (?, ?, ?, ?, ?, 'any', 'any', 0, 'interested')`,
      ["Taylor Nguyen", "555-0110", "taylor@example.com", "Prefers morning shifts", "demo seed"]
    );
  }

  const onCallCount = await sqlGet<{ c: number }>("SELECT COUNT(*) as c FROM on_call");
  if ((onCallCount?.c ?? 0) === 0) {
    await sqlRun(
      `INSERT INTO on_call (
        name, phone, email, availability, notice_minutes, available_dates, available_shifts,
        bilingual, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 45, 'any', 'any', 0, 'approved', datetime('now'), datetime('now'))`,
      ["Casey Jordan", "555-0120", "casey@example.com", "Can arrive within 30 minutes"]
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

function normalizeInterestedVolunteer(row: InterestedVolunteer): InterestedVolunteer {
  return {
    ...row,
    available_dates: row.available_dates || "any",
    available_shifts: row.available_shifts || "any",
    bilingual: row.bilingual ?? 0,
    status: (row.status || "interested") as InterestedVolunteerStatus,
    placed_event_date: row.placed_event_date ?? "",
    placed_shift_num: row.placed_shift_num ?? null,
    last_contacted: row.last_contacted ?? "",
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

export async function getInterestedVolunteerById(id: number): Promise<InterestedVolunteer | undefined> {
  await dbReady();
  const row = await sqlGet<InterestedVolunteer>(
    "SELECT * FROM interested_volunteers WHERE id = ?",
    [id]
  );
  return row ? normalizeInterestedVolunteer(row) : undefined;
}

export async function listInterestedVolunteers(
  status?: InterestedVolunteerStatus
): Promise<InterestedVolunteer[]> {
  await dbReady();
  const rows = status
    ? await sqlAll<InterestedVolunteer>(
        "SELECT * FROM interested_volunteers WHERE status = ? ORDER BY datetime(created_at) DESC, name",
        [status]
      )
    : await sqlAll<InterestedVolunteer>(
        "SELECT * FROM interested_volunteers ORDER BY datetime(created_at) DESC, name"
      );
  return rows.map(normalizeInterestedVolunteer);
}

export type InterestedVolunteerInput = Omit<
  InterestedVolunteer,
  "id" | "last_contacted" | "created_at" | "updated_at"
>;

export async function addInterestedVolunteer(v: InterestedVolunteerInput) {
  await dbReady();
  await sqlRun(
    `INSERT INTO interested_volunteers (
      name, phone, email, notes, source, available_dates, available_shifts, bilingual,
      status, placed_event_date, placed_shift_num
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      v.name,
      v.phone,
      v.email,
      v.notes,
      v.source,
      v.available_dates || "any",
      v.available_shifts || "any",
      v.bilingual ?? 0,
      v.status || "interested",
      v.placed_event_date ?? "",
      v.placed_shift_num ?? null,
    ]
  );
}

export async function updateInterestedVolunteer(
  id: number,
  patch: Partial<Omit<InterestedVolunteer, "id" | "created_at">>
) {
  await dbReady();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [k, val] of Object.entries(patch)) {
    if (k === "id" || k === "created_at") continue;
    fields.push(`${k} = ?`);
    values.push(val as string | number | null);
  }
  fields.push("updated_at = datetime('now')");
  values.push(id);
  await sqlRun(`UPDATE interested_volunteers SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteInterestedVolunteer(id: number) {
  await dbReady();
  await sqlRun("DELETE FROM interested_volunteers WHERE id = ?", [id]);
}

export async function unplaceInterestedMissingFromShift(shift: Shift): Promise<number> {
  await dbReady();
  const placed = await sqlAll<InterestedVolunteer>(
    "SELECT * FROM interested_volunteers WHERE status = 'placed' AND placed_event_date = ? AND placed_shift_num = ?",
    [shift.event_date, shift.shift_num]
  );
  if (!placed.length) return 0;
  const remaining = occupantsByShift([shift]);
  let count = 0;
  for (const volunteer of placed.map(normalizeInterestedVolunteer)) {
    if (!shouldUnplaceInterested(volunteer, remaining)) continue;
    await sqlRun(
      `UPDATE interested_volunteers
       SET status = 'interested', placed_event_date = '', placed_shift_num = NULL, updated_at = datetime('now')
       WHERE id = ?`,
      [volunteer.id]
    );
    count++;
  }
  return count;
}

export async function placeInterestedPresentOnShift(shift: Shift): Promise<number> {
  await dbReady();
  const open = await sqlAll<InterestedVolunteer>(
    "SELECT * FROM interested_volunteers WHERE status = 'interested'"
  );
  if (!open.length) return 0;
  const occupants = occupantsByShift([shift]);
  let count = 0;
  for (const volunteer of open.map(normalizeInterestedVolunteer)) {
    const match = shiftMatchForInterested(volunteer, occupants);
    if (!match) continue;
    await sqlRun(
      `UPDATE interested_volunteers
       SET status = 'placed', placed_event_date = ?, placed_shift_num = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [match.eventDate, match.shiftNum, volunteer.id]
    );
    count++;
  }
  return count;
}

export async function assignInterestedToShift(
  shiftId: number,
  interestedId: number,
  slotIndex: number,
  eventDate: string,
  shiftNum: number
): Promise<{ name: string } | null> {
  await dbReady();
  const volunteer = await sqlGet<InterestedVolunteer>(
    "SELECT * FROM interested_volunteers WHERE id = ?",
    [interestedId]
  );
  if (!volunteer || volunteer.status !== "interested") return null;

  const noteTag = `[Interested roster ${new Date().toISOString().slice(0, 16).replace("T", " ")}]`;
  await sqlRun(
    `INSERT INTO shift_assignments (shift_id, slot_index, name, phone, email)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(shift_id, slot_index) DO UPDATE SET
       name = excluded.name,
       phone = excluded.phone,
       email = excluded.email`,
    [shiftId, slotIndex, volunteer.name, volunteer.phone, volunteer.email]
  );
  await sqlRun(
    `UPDATE shifts SET no_show = 0, checked_in = 0,
       notes = CASE WHEN notes = '' THEN ? ELSE notes || ' ' || ? END
     WHERE id = ?`,
    [noteTag, noteTag, shiftId]
  );
  await sqlRun(
    `UPDATE interested_volunteers SET
      status = 'placed',
      placed_event_date = ?,
      placed_shift_num = ?,
      last_contacted = datetime('now'),
      updated_at = datetime('now')
    WHERE id = ?`,
    [eventDate, shiftNum, interestedId]
  );
  return { name: volunteer.name };
}

function normalizeOnCallShiftRequest(row: OnCallShiftRequest): OnCallShiftRequest {
  return {
    ...row,
    status: row.status === "fulfilled" || row.status === "cleared" ? row.status : "pending",
  };
}

function normalizeOnCallVolunteer(row: OnCallVolunteer): OnCallVolunteer {
  return {
    ...row,
    availability: row.availability ?? "",
    notice_minutes: row.notice_minutes ?? 45,
    available_dates: row.available_dates || "any",
    available_shifts: row.available_shifts || "any",
    bilingual: row.bilingual ?? 0,
    last_contacted: row.last_contacted ?? "",
    contacted_event_date: row.contacted_event_date ?? "",
    contacted_shift_num: row.contacted_shift_num ?? null,
    status: isOnCallVolunteerStatus(row.status) ? row.status : "approved",
    placed_event_date: row.placed_event_date ?? "",
    placed_shift_num: row.placed_shift_num ?? null,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

export async function listPendingOnCallShiftRequests(
  onCallId?: number
): Promise<OnCallShiftRequest[]> {
  await dbReady();
  const rows = onCallId
    ? await sqlAll<OnCallShiftRequest>(
        `SELECT * FROM on_call_shift_requests
         WHERE on_call_id = ? AND status = 'pending'
         ORDER BY datetime(contacted_at) DESC, event_date, shift_num`,
        [onCallId]
      )
    : await sqlAll<OnCallShiftRequest>(
        `SELECT * FROM on_call_shift_requests
         WHERE status = 'pending'
         ORDER BY datetime(contacted_at) DESC, on_call_id, event_date, shift_num`
      );
  return rows.map(normalizeOnCallShiftRequest);
}

export async function attachPendingOnCallShiftRequests(
  volunteers: OnCallVolunteer[]
): Promise<OnCallVolunteer[]> {
  if (!volunteers.length) return volunteers;
  const pending = await listPendingOnCallShiftRequests();
  const byVolunteer = new Map<number, OnCallShiftRequest[]>();
  for (const request of pending) {
    const list = byVolunteer.get(request.on_call_id) ?? [];
    list.push(request);
    byVolunteer.set(request.on_call_id, list);
  }
  return volunteers.map((volunteer) => ({
    ...volunteer,
    pending_shift_requests: byVolunteer.get(volunteer.id) ?? [],
  }));
}

async function syncOnCallOutreachSummary(onCallId: number): Promise<void> {
  const pending = await listPendingOnCallShiftRequests(onCallId);
  if (!pending.length) {
    await sqlRun(
      `UPDATE on_call SET
        last_contacted = '',
        contacted_event_date = '',
        contacted_shift_num = NULL,
        status = CASE WHEN status = 'shift_requested' THEN 'approved' ELSE status END,
        updated_at = datetime('now')
      WHERE id = ?`,
      [onCallId]
    );
    return;
  }
  const latest = pending[0];
  await sqlRun(
    `UPDATE on_call SET
      last_contacted = ?,
      contacted_event_date = ?,
      contacted_shift_num = ?,
      status = CASE WHEN status IN ('approved', 'shift_requested') THEN 'shift_requested' ELSE status END,
      updated_at = datetime('now')
    WHERE id = ?`,
    [latest.contacted_at, latest.event_date, latest.shift_num, onCallId]
  );
}

export async function clearPendingOnCallShiftRequests(onCallId: number): Promise<void> {
  await dbReady();
  await sqlRun(
    `UPDATE on_call_shift_requests SET status = 'cleared' WHERE on_call_id = ? AND status = 'pending'`,
    [onCallId]
  );
  await syncOnCallOutreachSummary(onCallId);
}

export async function fulfillOnCallShiftRequest(
  onCallId: number,
  eventDate: string,
  shiftNum: number
): Promise<void> {
  await dbReady();
  await sqlRun(
    `UPDATE on_call_shift_requests SET status = 'fulfilled'
     WHERE on_call_id = ? AND event_date = ? AND shift_num = ? AND status = 'pending'`,
    [onCallId, eventDate, shiftNum]
  );
  await syncOnCallOutreachSummary(onCallId);
}

export async function addOnCallShiftRequest(
  onCallId: number,
  eventDate: string,
  shiftNum: number
): Promise<void> {
  await dbReady();
  await sqlRun(
    `INSERT INTO on_call_shift_requests (on_call_id, event_date, shift_num, contacted_at, status)
     VALUES (?, ?, ?, datetime('now'), 'pending')`,
    [onCallId, eventDate, shiftNum]
  );
  await syncOnCallOutreachSummary(onCallId);
}

export async function getOnCallById(id: number): Promise<OnCallVolunteer | undefined> {
  await dbReady();
  const row = await sqlGet<OnCallVolunteer>("SELECT * FROM on_call WHERE id = ?", [id]);
  if (!row) return undefined;
  const [attached] = await attachPendingOnCallShiftRequests([normalizeOnCallVolunteer(row)]);
  return attached;
}

export async function listOnCall(status?: OnCallVolunteerStatus): Promise<OnCallVolunteer[]> {
  await dbReady();
  const rows = status
    ? await sqlAll<OnCallVolunteer>("SELECT * FROM on_call WHERE status = ? ORDER BY name", [status])
    : await sqlAll<OnCallVolunteer>("SELECT * FROM on_call ORDER BY name");
  return attachPendingOnCallShiftRequests(rows.map(normalizeOnCallVolunteer));
}

export async function listActiveOnCall(): Promise<OnCallVolunteer[]> {
  await dbReady();
  const placeholders = ON_CALL_ACTIVE_STATUSES.map(() => "?").join(", ");
  const rows = await sqlAll<OnCallVolunteer>(
    `SELECT * FROM on_call WHERE status IN (${placeholders}) ORDER BY name`,
    [...ON_CALL_ACTIVE_STATUSES]
  );
  return attachPendingOnCallShiftRequests(rows.map(normalizeOnCallVolunteer));
}

export async function addOnCall(
  v: Omit<
    OnCallVolunteer,
    | "id"
    | "last_contacted"
    | "contacted_event_date"
    | "contacted_shift_num"
    | "created_at"
    | "updated_at"
    | "placed_event_date"
    | "placed_shift_num"
    | "pending_shift_requests"
  > & {
    placed_event_date?: string;
    placed_shift_num?: number | null;
  }
) {
  await dbReady();
  await sqlRun(
    `INSERT INTO on_call (
      name, phone, email, availability, notice_minutes, available_dates, available_shifts, bilingual, status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      v.name,
      v.phone,
      v.email,
      v.availability,
      v.notice_minutes ?? 45,
      v.available_dates || "any",
      v.available_shifts || "any",
      v.bilingual ?? 0,
      v.status || "approved",
    ]
  );
}

export async function updateOnCall(id: number, patch: Partial<Omit<OnCallVolunteer, "id" | "created_at">>) {
  await dbReady();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (k === "id" || k === "created_at" || k === "pending_shift_requests") continue;
    fields.push(`${k} = ?`);
    values.push(v as string | number | null);
  }
  if (!fields.length) return;
  fields.push("updated_at = datetime('now')");
  values.push(id);
  await sqlRun(`UPDATE on_call SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteOnCall(id: number) {
  await dbReady();
  await sqlRun("DELETE FROM on_call_shift_requests WHERE on_call_id = ?", [id]);
  await sqlRun("DELETE FROM on_call WHERE id = ?", [id]);
}

export async function assignOnCallToShift(
  shiftId: number,
  onCallId: number,
  slotIndex: number,
  eventDate: string,
  shiftNum: number
): Promise<{ name: string } | null> {
  await dbReady();
  const onCall = await getOnCallById(onCallId);
  if (!onCall || !ON_CALL_ACTIVE_STATUSES.includes(onCall.status)) return null;

  const noteTag = `[On-call ${new Date().toISOString().slice(0, 16).replace("T", " ")}]`;
  await sqlRun(
    `INSERT INTO shift_assignments (shift_id, slot_index, name, phone, email)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(shift_id, slot_index) DO UPDATE SET
       name = excluded.name,
       phone = excluded.phone,
       email = excluded.email`,
    [shiftId, slotIndex, onCall.name, onCall.phone, onCall.email]
  );
  await sqlRun(
    `UPDATE shifts SET no_show = 0, checked_in = 0,
       notes = CASE WHEN notes = '' THEN ? ELSE notes || ' ' || ? END
     WHERE id = ?`,
    [noteTag, noteTag, shiftId]
  );
  await fulfillOnCallShiftRequest(onCallId, eventDate, shiftNum);
  await sqlRun(
    `UPDATE on_call SET
      status = 'shift_assigned',
      placed_event_date = ?,
      placed_shift_num = ?,
      last_contacted = datetime('now'),
      contacted_event_date = '',
      contacted_shift_num = NULL,
      updated_at = datetime('now')
    WHERE id = ?`,
    [eventDate, shiftNum, onCallId]
  );
  return { name: onCall.name };
}

export async function getIssueById(id: number): Promise<Issue | undefined> {
  await dbReady();
  return sqlGet<Issue>("SELECT * FROM issues WHERE id = ?", [id]);
}

export async function listIssues(eventDate?: string): Promise<Issue[]> {
  await dbReady();
  return eventDate
    ? sqlAll<Issue>("SELECT * FROM issues WHERE event_date = ? ORDER BY created_at DESC", [eventDate])
    : sqlAll<Issue>("SELECT * FROM issues ORDER BY created_at DESC");
}

export async function addIssue(issue: {
  event_date: string;
  shift?: string;
  category?: string;
  description: string;
}) {
  await dbReady();
  await sqlRun(
    `INSERT INTO issues (event_date, shift, category, description) VALUES (?, ?, ?, ?)`,
    [issue.event_date, issue.shift ?? "", issue.category ?? "visitor", issue.description]
  );
}

export async function resolveIssue(id: number) {
  await dbReady();
  await sqlRun("UPDATE issues SET resolved = 1 WHERE id = ?", [id]);
}

export async function setIssueResponse(id: number, adminResponse: string): Promise<void> {
  await dbReady();
  await sqlRun(
    `UPDATE issues SET admin_response = ?, admin_response_at = datetime('now') WHERE id = ?`,
    [adminResponse, id]
  );
}

export async function listCaptainFeedback(): Promise<CaptainFeedback[]> {
  await dbReady();
  return sqlAll<CaptainFeedback>("SELECT * FROM captain_feedback ORDER BY created_at DESC");
}

export async function addCaptainFeedback(feedback: {
  name?: string;
  email?: string;
  event_date?: string;
  category?: string;
  portal_rating?: number | null;
  comments: string;
}) {
  await dbReady();
  await sqlRun(
    `INSERT INTO captain_feedback (name, email, event_date, category, portal_rating, comments)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      feedback.name ?? "",
      feedback.email ?? "",
      feedback.event_date ?? "",
      feedback.category ?? "general",
      feedback.portal_rating ?? null,
      feedback.comments,
    ]
  );
}

export async function getCaptainFeedbackById(id: number): Promise<CaptainFeedback | undefined> {
  await dbReady();
  return sqlGet<CaptainFeedback>("SELECT * FROM captain_feedback WHERE id = ?", [id]);
}

export async function setCaptainFeedbackResponse(id: number, adminResponse: string): Promise<void> {
  await dbReady();
  await sqlRun(
    `UPDATE captain_feedback SET admin_response = ?, admin_response_at = datetime('now') WHERE id = ?`,
    [adminResponse, id]
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
  const { listPortalEventsForExport, listPortalSessionsForExport } = await import(
    "../portal-analytics"
  );
  const [
    shifts,
    assignments,
    onCall,
    onCallShiftRequests,
    interestedVolunteers,
    issues,
    dayCaptains,
    captainFeedback,
    portalSessions,
    portalEvents,
    auditLog,
  ] = await Promise.all([
    sqlAll("SELECT * FROM shifts ORDER BY event_date, shift_num"),
    sqlAll("SELECT * FROM shift_assignments ORDER BY shift_id, slot_index"),
    sqlAll("SELECT * FROM on_call ORDER BY name"),
    sqlAll(
      `SELECT * FROM on_call_shift_requests
       WHERE status = 'pending'
       ORDER BY on_call_id, datetime(contacted_at) DESC`
    ),
    sqlAll("SELECT * FROM interested_volunteers ORDER BY name"),
    sqlAll("SELECT * FROM issues ORDER BY created_at DESC"),
    sqlAll("SELECT * FROM day_captains ORDER BY event_date, captain_slot"),
    sqlAll("SELECT * FROM captain_feedback ORDER BY created_at DESC"),
    listPortalSessionsForExport(),
    listPortalEventsForExport(),
    listAuditLog(10_000),
  ]);
  return {
    shifts,
    assignments,
    onCall,
    onCallShiftRequests,
    interestedVolunteers,
    issues,
    dayCaptains,
    captainFeedback,
    portalSessions,
    portalEvents,
    auditLog,
    exportedAt: new Date().toISOString(),
  };
}
