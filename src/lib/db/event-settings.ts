import { sqlAll, sqlBatch, sqlGet, sqlRun } from "../db-client";
import { getCaptainSlotsForDate } from "../day-captain-slots";
import {
  eventSettingsFromConfig,
  getActiveEventSettings,
  listEventDates,
  setActiveEventSettings,
  type EventSettings,
} from "../event-settings";
import { getBoothConfig, type CaptainSplitBlock, type ShiftTemplate } from "../booth-config";
import { officialSlotIndexes } from "../shift-slots";

type EventSettingsRow = {
  year: number;
  open_date: string;
  close_date: string;
  setup_start_date: string;
  setup_end_date: string;
  captain_tools_open_date: string;
  split_captain_date: string;
  booth_name: string;
  booth_location: string;
  booth_hours: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  timezone: string;
  official_slots_per_shift: number;
  shift_templates_json: string;
  captain_split_json: string;
};

let hydrated = false;

export async function ensureEventSettingsSchema(): Promise<void> {
  await sqlRun(`
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
    )
  `);
}

function parseTemplates(raw: string): ShiftTemplate[] {
  try {
    const parsed = JSON.parse(raw) as ShiftTemplate[];
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    /* fall through */
  }
  return getBoothConfig().shifts.templates.map((t) => ({ ...t }));
}

function parseSplit(raw: string): EventSettings["captainSplit"] {
  try {
    const parsed = JSON.parse(raw) as EventSettings["captainSplit"];
    if (parsed?.am && parsed?.pm) return parsed;
  } catch {
    /* fall through */
  }
  const split = getBoothConfig().captains.split;
  return {
    am: { ...split.am, shiftNums: [...split.am.shiftNums] },
    pm: { ...split.pm, shiftNums: [...split.pm.shiftNums] },
  };
}

function rowToSettings(row: EventSettingsRow): EventSettings {
  return {
    year: row.year,
    openDate: row.open_date,
    closeDate: row.close_date,
    setupStartDate: row.setup_start_date ?? "",
    setupEndDate: row.setup_end_date ?? "",
    captainToolsOpenDate: row.captain_tools_open_date,
    splitCaptainDate: row.split_captain_date ?? "",
    boothName: row.booth_name,
    boothLocation: row.booth_location,
    boothHours: row.booth_hours,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    timezone: row.timezone,
    officialSlotsPerShift: row.official_slots_per_shift,
    shiftTemplates: parseTemplates(row.shift_templates_json),
    captainSplit: parseSplit(row.captain_split_json),
  };
}

export async function readEventSettings(): Promise<EventSettings> {
  const row = await sqlGet<EventSettingsRow>(
    `SELECT year, open_date, close_date, setup_start_date, setup_end_date,
            captain_tools_open_date, split_captain_date, booth_name, booth_location,
            booth_hours, contact_name, contact_phone, contact_email, timezone,
            official_slots_per_shift, shift_templates_json, captain_split_json
       FROM event_settings WHERE id = 1`
  );
  return row ? rowToSettings(row) : eventSettingsFromConfig();
}

export async function writeEventSettings(settings: EventSettings): Promise<void> {
  await sqlRun(
    `INSERT INTO event_settings (
        id, year, open_date, close_date, setup_start_date, setup_end_date,
        captain_tools_open_date, split_captain_date, booth_name, booth_location,
        booth_hours, contact_name, contact_phone, contact_email, timezone,
        official_slots_per_shift, shift_templates_json, captain_split_json, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        year = excluded.year,
        open_date = excluded.open_date,
        close_date = excluded.close_date,
        setup_start_date = excluded.setup_start_date,
        setup_end_date = excluded.setup_end_date,
        captain_tools_open_date = excluded.captain_tools_open_date,
        split_captain_date = excluded.split_captain_date,
        booth_name = excluded.booth_name,
        booth_location = excluded.booth_location,
        booth_hours = excluded.booth_hours,
        contact_name = excluded.contact_name,
        contact_phone = excluded.contact_phone,
        contact_email = excluded.contact_email,
        timezone = excluded.timezone,
        official_slots_per_shift = excluded.official_slots_per_shift,
        shift_templates_json = excluded.shift_templates_json,
        captain_split_json = excluded.captain_split_json,
        updated_at = datetime('now')`,
    [
      settings.year,
      settings.openDate,
      settings.closeDate,
      settings.setupStartDate,
      settings.setupEndDate,
      settings.captainToolsOpenDate,
      settings.splitCaptainDate,
      settings.boothName,
      settings.boothLocation,
      settings.boothHours,
      settings.contactName,
      settings.contactPhone,
      settings.contactEmail,
      settings.timezone,
      settings.officialSlotsPerShift,
      JSON.stringify(settings.shiftTemplates),
      JSON.stringify(settings.captainSplit),
    ]
  );
}

export async function seedDefaultEventSettings(): Promise<void> {
  const existing = await sqlGet<{ year: number }>("SELECT year FROM event_settings WHERE id = 1");
  if (existing) return;
  await writeEventSettings(eventSettingsFromConfig());
}

export async function hydrateEventSettings(): Promise<EventSettings> {
  if (hydrated) return getActiveEventSettings();
  await ensureEventSettingsSchema();
  await seedDefaultEventSettings();
  const settings = await readEventSettings();
  setActiveEventSettings(settings);
  hydrated = true;
  return settings;
}

export async function ensureEventScheduleRows(settings: EventSettings): Promise<void> {
  setActiveEventSettings(settings);
  const dates = listEventDates(settings);
  const templates = settings.shiftTemplates;
  const slots = officialSlotIndexes(settings.officialSlotsPerShift);
  const stmts: { sql: string; args: (string | number)[] }[] = [];
  for (const date of dates) {
    for (const shift of templates) {
      stmts.push({
        sql: "INSERT OR IGNORE INTO shifts (event_date, shift_num) VALUES (?, ?)",
        args: [date, shift.num],
      });
    }
    for (const slot of getCaptainSlotsForDate(date)) {
      stmts.push({
        sql: "INSERT OR IGNORE INTO day_captains (event_date, captain_slot) VALUES (?, ?)",
        args: [date, slot.slot],
      });
    }
  }
  if (stmts.length) await sqlBatch(stmts);

  const shiftRows = await sqlAll<{ id: number }>(
    "SELECT id FROM shifts WHERE event_date >= ? AND event_date <= ?",
    [settings.openDate, settings.closeDate]
  );
  const assignmentStmts: { sql: string; args: (string | number)[] }[] = [];
  for (const row of shiftRows) {
    for (const slotIndex of slots) {
      assignmentStmts.push({
        sql: "INSERT OR IGNORE INTO shift_assignments (shift_id, slot_index, name, phone, email) VALUES (?, ?, '', '', '')",
        args: [row.id, slotIndex],
      });
    }
  }
  if (assignmentStmts.length) await sqlBatch(assignmentStmts);
}

export type { CaptainSplitBlock };
