import type { CaptainSlot } from "./day-captain-slots";
import {
  getCaptainSlotsForDate,
  isSplitCaptainDay,
} from "./day-captain-slots";
import { formatEventDate, getEventDates, isEventDate } from "./event-dates";
import { ensureAnalyticsSchema } from "./portal-analytics";
import {
  deletePortalDevice,
  getPortalDevice,
  ipHasConfirmedDevice,
  isConfirmedPortalDevice,
  lockedNotesFromPortalDevice,
  resolvePortalLogNameFromDevice,
  upsertConfirmedPortalDevice,
  type PortalDevice,
} from "./portal-devices";
import { sqlAll, sqlGet, sqlRun } from "./db-client";
import {
  ADMIN_DAY_CAPTAIN_KEY,
  GUEST_DAY_CAPTAIN_KEY,
  PORTAL_ADMIN_NAMES,
  adminCaptainIpNotes,
  adminDayCaptainOption,
  adminDayCaptainOptions,
  adminDisplayNameFromNotes,
  encodeAdminCaptainKey,
  guestDayCaptainOption,
  guestDisplayNameFromNotes,
  guestIpNotes,
  isAdminCaptainKey,
  isAdminIdentifiedMapping,
  isGuestIdentifiedMapping,
  type DayCaptainOption,
} from "./captain-ip-mapping-keys";
export {
  ADMIN_DAY_CAPTAIN_KEY,
  GUEST_DAY_CAPTAIN_KEY,
  PORTAL_ADMIN_NAMES,
  adminCaptainIpNotes,
  adminDayCaptainOption,
  adminDayCaptainOptions,
  adminDisplayNameFromNotes,
  encodeAdminCaptainKey,
  guestDayCaptainOption,
  guestDisplayNameFromNotes,
  guestIpNotes,
  isAdminCaptainKey,
  isAdminIdentifiedMapping,
  isGuestIdentifiedMapping,
  type DayCaptainOption,
} from "./captain-ip-mapping-keys";

export type CaptainIpMappingSource = "inferred" | "admin";

export interface CaptainIpMapping {
  client_ip: string;
  event_date: string;
  captain_slot: CaptainSlot;
  source: CaptainIpMappingSource;
  visit_count: number;
  last_seen_at: string | null;
  last_session_id: string | null;
  notes: string;
  device_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Admin-confirmed captain device — IP stays on this captain until manually changed. */
export function isLockedCaptainMapping(
  row: Pick<CaptainIpMapping, "source" | "notes">
): boolean {
  return (
    row.source === "admin" &&
    row.notes.trim() !== "" &&
    !isAdminIdentifiedMapping(row) &&
    !isGuestIdentifiedMapping(row)
  );
}

/** Admin-named non-captain device — label persists across visit days. */
export function isLockedGuestMapping(
  row: Pick<CaptainIpMapping, "source" | "notes">
): boolean {
  return row.source === "admin" && isGuestIdentifiedMapping(row);
}

export interface LockedCaptainIdentity {
  captain_slot: CaptainSlot;
  notes: string;
}

/** Most recent admin-confirmed captain identity for a static IP (excludes PI admin visits). */
export function pickLockedCaptainIdentity(
  rows: Pick<CaptainIpMapping, "source" | "notes" | "captain_slot" | "last_seen_at">[]
): LockedCaptainIdentity | null {
  const locked = rows
    .filter(isLockedCaptainMapping)
    .sort((a, b) => (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? ""));
  const top = locked[0];
  if (!top) return null;
  return { captain_slot: top.captain_slot, notes: top.notes };
}

/** Most recent admin-named guest label for a static IP. */
export function pickLockedGuestLabel(
  rows: Pick<CaptainIpMapping, "source" | "notes" | "last_seen_at">[]
): string | null {
  const locked = rows
    .filter(isLockedGuestMapping)
    .sort((a, b) => (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? ""));
  const top = locked[0];
  if (!top) return null;
  return top.notes;
}

/** Most recent admin-named device label for a static IP. */
export function pickLockedAdminLabel(
  rows: Pick<CaptainIpMapping, "source" | "notes" | "last_seen_at">[]
): string | null {
  const locked = rows
    .filter((row) => row.source === "admin" && isAdminIdentifiedMapping(row))
    .sort((a, b) => (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? ""));
  const top = locked[0];
  if (!top) return null;
  return top.notes;
}

export function resolveAssignedCaptainKey(
  row: Pick<CaptainIpMapping, "notes" | "event_date" | "captain_slot" | "source">,
  options: DayCaptainOption[]
): string {
  if (isAdminIdentifiedMapping(row)) {
    return encodeAdminCaptainKey(adminDisplayNameFromNotes(row.notes));
  }
  if (isGuestIdentifiedMapping(row)) return GUEST_DAY_CAPTAIN_KEY;

  const manual = row.notes.trim();
  if (manual) {
    const byName = options.find((option) => option.captain_name.trim() === manual);
    if (byName) return byName.key;
  }

  if (row.source === "admin" && !manual) {
    return encodeAdminCaptainKey(PORTAL_ADMIN_NAMES[0]);
  }

  return encodeDayCaptainKey(row.event_date, row.captain_slot);
}

export interface CaptainDeviceEntry {
  client_ip: string;
  locked: boolean;
  totalVisits: number;
  visitDays: string[];
  lastSeenAt: string | null;
  /** Visit day for the most recent mapping — used for edit anchor links. */
  primaryVisitDay: string;
  /** Named label for guest / other devices. */
  displayName?: string;
}

/** In-page anchor id for a mapping edit row on `/captain-ips`. */
export function captainIpMappingAnchor(clientIp: string): string {
  return `mapping-${clientIp.trim()}`;
}

export interface IpMappingSummary {
  client_ip: string;
  captainKey: string;
  captainLabel: string;
  locked: boolean;
  source: CaptainIpMappingSource;
  totalVisits: number;
  firstVisitDay: string;
  firstSeenAt: string | null;
  lastVisitDay: string;
  lastSeenAt: string | null;
  conflict: boolean;
  conflictLabels: string[];
}

function captainLabelForKey(key: string, options: DayCaptainOption[]): string {
  if (isAdminCaptainKey(key)) {
    return options.find((option) => option.key === key)?.label ?? adminDayCaptainOption().label;
  }
  if (key === GUEST_DAY_CAPTAIN_KEY) return guestDayCaptainOption().label;
  return options.find((option) => option.key === key)?.label ?? key;
}

/** One row per IP — first/last visit day and assigned captain (flags multi-captain conflicts). */
export function summarizeMappingsByIp(
  mappings: EnrichedCaptainIpMapping[],
  options: DayCaptainOption[]
): IpMappingSummary[] {
  const byIp = new Map<string, EnrichedCaptainIpMapping[]>();
  for (const row of mappings) {
    const ip = row.client_ip.trim();
    if (!ip) continue;
    const bucket = byIp.get(ip) ?? [];
    bucket.push(row);
    byIp.set(ip, bucket);
  }

  return [...byIp.entries()]
    .map(([client_ip, rows]) => {
      const visitDays = [...new Set(rows.map((row) => row.event_date))].sort();
      const firstVisitDay = visitDays[0] ?? "";
      const lastVisitDay = visitDays[visitDays.length - 1] ?? firstVisitDay;

      const sortedBySeen = [...rows].sort((a, b) =>
        (a.last_seen_at ?? "").localeCompare(b.last_seen_at ?? "")
      );
      const firstSeenAt = sortedBySeen[0]?.last_seen_at ?? null;
      const lastSeenAt = sortedBySeen[sortedBySeen.length - 1]?.last_seen_at ?? null;

      const captainKeys = [...new Set(rows.map((row) => resolveAssignedCaptainKey(row, options)))];
      const conflict = captainKeys.length > 1;
      const conflictLabels = captainKeys.map((key) => captainLabelForKey(key, options));

      const lockedRows = rows.filter(
        (row) => isLockedCaptainMapping(row) || isLockedGuestMapping(row)
      );
      const locked = lockedRows.length > 0;
      const primaryRow =
        lockedRows.sort((a, b) => (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? ""))[0] ??
        sortedBySeen[sortedBySeen.length - 1];

      const captainKey = resolveAssignedCaptainKey(primaryRow, options);
      const source: CaptainIpMappingSource = rows.some((row) => row.source === "admin")
        ? "admin"
        : "inferred";

      const captainLabel =
        captainKey === GUEST_DAY_CAPTAIN_KEY
          ? primaryRow.display_name
          : captainLabelForKey(captainKey, options);

      return {
        client_ip,
        captainKey,
        captainLabel,
        locked,
        source,
        totalVisits: rows.reduce((sum, row) => sum + row.visit_count, 0),
        firstVisitDay,
        firstSeenAt,
        lastVisitDay,
        lastSeenAt,
        conflict,
        conflictLabels,
      };
    })
    .sort((a, b) => (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? ""));
}

export interface CaptainDeviceGroup {
  captainKey: string;
  label: string;
  eventDate: string;
  captainName: string;
  devices: CaptainDeviceEntry[];
}

/** Group mappings by rostered captain (or admin) with deduplicated IPs. */
export function groupCaptainDevicesByCaptain(
  mappings: EnrichedCaptainIpMapping[],
  options: DayCaptainOption[]
): CaptainDeviceGroup[] {
  const optionByKey = new Map(options.map((option) => [option.key, option]));
  for (const adminOption of adminDayCaptainOptions()) {
    optionByKey.set(adminOption.key, adminOption);
  }
  optionByKey.set(GUEST_DAY_CAPTAIN_KEY, guestDayCaptainOption());

  const devicesByCaptain = new Map<
    string,
    Map<
      string,
      {
        locked: boolean;
        totalVisits: number;
        visitDays: string[];
        lastSeenAt: string | null;
        primaryVisitDay: string;
        displayName: string;
      }
    >
  >();

  for (const row of mappings) {
    const captainKey = resolveAssignedCaptainKey(row, options);
    const ip = row.client_ip.trim();
    if (!ip) continue;

    if (!devicesByCaptain.has(captainKey)) {
      devicesByCaptain.set(captainKey, new Map());
    }
    const devices = devicesByCaptain.get(captainKey)!;
    const prior = devices.get(ip);
    const lastSeen = row.last_seen_at ?? null;
    const locked = isLockedCaptainMapping(row) || isLockedGuestMapping(row);

    if (!prior) {
      devices.set(ip, {
        locked,
        totalVisits: row.visit_count,
        visitDays: [row.event_date],
        lastSeenAt: lastSeen,
        primaryVisitDay: row.event_date,
        displayName: row.display_name,
      });
      continue;
    }

    prior.totalVisits += row.visit_count;
    if (!prior.visitDays.includes(row.event_date)) {
      prior.visitDays.push(row.event_date);
      prior.visitDays.sort();
    }
    if (locked) prior.locked = true;
    if ((lastSeen ?? "") > (prior.lastSeenAt ?? "")) {
      prior.lastSeenAt = lastSeen;
      prior.primaryVisitDay = row.event_date;
      prior.displayName = row.display_name;
    }
  }

  const groups: CaptainDeviceGroup[] = [];
  for (const [captainKey, devices] of devicesByCaptain) {
    const option = optionByKey.get(captainKey);
    groups.push({
      captainKey,
      label: option?.label ?? captainKey,
      eventDate: option?.event_date ?? "",
      captainName:
        captainKey === GUEST_DAY_CAPTAIN_KEY
          ? "Other devices"
          : (option?.captain_name ?? captainKey),
      devices: [...devices.entries()]
        .map(([client_ip, stats]) => ({
          client_ip,
          locked: stats.locked,
          totalVisits: stats.totalVisits,
          visitDays: stats.visitDays,
          lastSeenAt: stats.lastSeenAt,
          primaryVisitDay: stats.primaryVisitDay,
          displayName:
            captainKey === GUEST_DAY_CAPTAIN_KEY ? stats.displayName : undefined,
        }))
        .sort((a, b) => (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? "")),
    });
  }

  const scheduleOrder = new Map(options.map((option, index) => [option.key, index]));
  groups.sort((a, b) => {
    if (isAdminCaptainKey(a.captainKey) && !isAdminCaptainKey(b.captainKey)) return 1;
    if (isAdminCaptainKey(b.captainKey) && !isAdminCaptainKey(a.captainKey)) return -1;
    if (a.captainKey === GUEST_DAY_CAPTAIN_KEY) return 1;
    if (b.captainKey === GUEST_DAY_CAPTAIN_KEY) return -1;
    return (scheduleOrder.get(a.captainKey) ?? 999) - (scheduleOrder.get(b.captainKey) ?? 999);
  });

  return groups.filter((group) => group.devices.length > 0);
}

/** Full roster plus admins and named guest — for inferred-visit confirmation pickers. */
export function inferredVisitCaptainOptions(options: DayCaptainOption[]): DayCaptainOption[] {
  return [...adminDayCaptainOptions(), guestDayCaptainOption(), ...options];
}

/** All roster slots + admin + guest — for editing an existing IP mapping. */
export function mappingEditCaptainOptions(options: DayCaptainOption[]): DayCaptainOption[] {
  return inferredVisitCaptainOptions(options);
}

/** Slots for one schedule day only (e.g. AM/PM on split days). */
export function captainSlotsOnDateLabel(
  options: DayCaptainOption[],
  eventDate: string
): string {
  const count = dayCaptainOptionsForDate(options, eventDate).length;
  if (count <= 1) return "1 captain slot this day";
  return `${count} captain slots this day`;
}

/** Stable id for a scheduled day captain slot (`event_date:slot`). */
export function encodeDayCaptainKey(eventDate: string, captainSlot: CaptainSlot): string {
  return `${eventDate}:${captainSlot}`;
}

export function parseDayCaptainKey(
  key: string
): { eventDate: string; captainSlot: CaptainSlot } | null {
  const match = key.trim().match(/^(\d{4}-\d{2}-\d{2}):(full|am|pm)$/);
  if (!match) return null;

  const eventDate = match[1];
  const captainSlot = match[2] as CaptainSlot;
  if (!isEventDate(eventDate)) return null;

  const slots = getCaptainSlotsForDate(eventDate).map((cfg) => cfg.slot);
  if (!slots.includes(captainSlot)) return null;

  return { eventDate, captainSlot };
}

export async function listDayCaptainOptions(): Promise<DayCaptainOption[]> {
  const { getDayCaptains } = await import("./db");
  const options: DayCaptainOption[] = [];

  for (const eventDate of getEventDates()) {
    const [slotConfigs, captains] = [
      getCaptainSlotsForDate(eventDate),
      await getDayCaptains(eventDate),
    ];

    for (const cfg of slotConfigs) {
      const captain = captains.find((row) => row.captain_slot === cfg.slot);
      const captainName = captain?.name?.trim() ?? "";
      const nameLabel = captainName || "Unassigned";
      const dayLabel = formatEventDate(eventDate);

      options.push({
        key: encodeDayCaptainKey(eventDate, cfg.slot),
        event_date: eventDate,
        captain_slot: cfg.slot,
        captain_name: captainName,
        label: isSplitCaptainDay(eventDate)
          ? `${dayLabel} — ${cfg.timeRange} — ${nameLabel}`
          : `${dayLabel} — ${nameLabel}`,
      });
    }
  }

  return options;
}

export function dayCaptainOptionsForDate(
  options: DayCaptainOption[],
  eventDate: string
): DayCaptainOption[] {
  return options.filter((option) => option.event_date === eventDate);
}

export function resolveCaptainIpMappingSelection(params: {
  dayCaptainKey: string;
  visitedEventDate?: string;
  firstVisitDay?: string;
  guestName?: string;
  options: DayCaptainOption[];
}): { eventDate: string; captainSlot: CaptainSlot; notes: string } | null {
  const key = params.dayCaptainKey.trim();
  if (!key) return null;

  const visitedEventDate = params.visitedEventDate?.trim();
  const firstVisitDay = params.firstVisitDay?.trim();
  const anchorEventDate =
    (visitedEventDate && isEventDate(visitedEventDate) && visitedEventDate) ||
    (firstVisitDay && isEventDate(firstVisitDay) && firstVisitDay) ||
    null;
  const useVisitedDate = Boolean(anchorEventDate);

  if (key === GUEST_DAY_CAPTAIN_KEY) {
    const notes = guestIpNotes(params.guestName ?? "");
    if (!notes) return null;
    const eventDate = anchorEventDate ?? getEventDates()[0];
    if (!eventDate) return null;
    return {
      eventDate,
      captainSlot: defaultCaptainSlotForInference(eventDate),
      notes,
    };
  }

  if (isAdminCaptainKey(key)) {
    if (!useVisitedDate || !anchorEventDate) return null;
    const option = params.options.find((row) => row.key === key);
    let name = option?.captain_name ?? "";
    if (!name && key === ADMIN_DAY_CAPTAIN_KEY) {
      name = adminDayCaptainOptions()[0]?.captain_name ?? "";
    }
    if (!name) {
      name =
        PORTAL_ADMIN_NAMES.find((adminName) => encodeAdminCaptainKey(adminName) === key) ?? "";
    }
    if (!name) return null;
    return {
      eventDate: anchorEventDate,
      captainSlot: defaultCaptainSlotForInference(anchorEventDate),
      notes: adminCaptainIpNotes(name),
    };
  }

  const parsed = parseDayCaptainKey(key);
  if (!parsed) return null;

  const option = params.options.find((row) => row.key === key);
  const notes = option?.captain_name ?? "";

  if (useVisitedDate && anchorEventDate) {
    const captainSlot =
      parsed.eventDate === anchorEventDate
        ? parsed.captainSlot
        : defaultCaptainSlotForInference(anchorEventDate);
    return { eventDate: anchorEventDate, captainSlot, notes };
  }

  return {
    eventDate: parsed.eventDate,
    captainSlot: parsed.captainSlot,
    notes,
  };
}

export interface CaptainIpVisitSignal {
  client_ip: string;
  event_date: string;
  visit_count: number;
  last_seen_at: string;
  last_session_id: string | null;
}

let schemaReady = false;

async function ensureCaptainIpSchema(): Promise<void> {
  if (schemaReady) return;
  await ensureAnalyticsSchema();
  await sqlRun(`
    CREATE TABLE IF NOT EXISTS captain_ip_mappings (
      client_ip TEXT NOT NULL,
      event_date TEXT NOT NULL,
      captain_slot TEXT NOT NULL DEFAULT 'full',
      source TEXT NOT NULL DEFAULT 'inferred',
      visit_count INTEGER NOT NULL DEFAULT 0,
      last_seen_at TEXT,
      last_session_id TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (client_ip, event_date)
    )
  `);
  await sqlRun(
    "CREATE INDEX IF NOT EXISTS idx_captain_ip_mappings_date ON captain_ip_mappings(event_date, last_seen_at)"
  );
  const { ensurePortalDeviceSchema } = await import("./portal-devices");
  await ensurePortalDeviceSchema();
  schemaReady = true;
}

/** Extract schedule day from `/day/[date]` paths (dashboard, eod, legacy roster). */
export function parseEventDateFromDayPath(path: string): string | null {
  const match = path.match(/^\/day\/(\d{4}-\d{2}-\d{2})(?:\/|$)/);
  if (!match) return null;
  return isEventDate(match[1]) ? match[1] : null;
}

/** Captain/admin *edits* on a event day tag the IP — not merely opening the day page. */
export function shouldInferCaptainIp(
  authRole: string | null,
  eventDate: string | null | undefined
): boolean {
  const date = eventDate?.trim() ?? "";
  if (!date || !isEventDate(date)) return false;
  return authRole === "captain" || authRole === "admin";
}

/** Default slot when inferring from day-page visits (split days need admin confirmation). */
export function defaultCaptainSlotForInference(eventDate: string): CaptainSlot {
  return isSplitCaptainDay(eventDate) ? "am" : "full";
}

async function lockedAdminLabelForIp(clientIp: string): Promise<string | null> {
  const device = await getPortalDevice(clientIp);
  if (device && isAdminIdentifiedMapping(device)) return device.notes;

  await ensureCaptainIpSchema();
  const rows = await sqlAll<Pick<CaptainIpMapping, "source" | "notes" | "last_seen_at">>(
    `SELECT source, notes, last_seen_at
     FROM captain_ip_mappings
     WHERE client_ip = ?
     ORDER BY last_seen_at DESC`,
    [clientIp.trim()]
  );
  return pickLockedAdminLabel(rows);
}

async function lockedGuestLabelForIp(clientIp: string): Promise<string | null> {
  const device = await getPortalDevice(clientIp);
  if (device && isGuestIdentifiedMapping(device)) return device.notes;

  await ensureCaptainIpSchema();
  const rows = await sqlAll<Pick<CaptainIpMapping, "source" | "notes" | "last_seen_at">>(
    `SELECT source, notes, last_seen_at
     FROM captain_ip_mappings
     WHERE client_ip = ?
     ORDER BY last_seen_at DESC`,
    [clientIp.trim()]
  );
  return pickLockedGuestLabel(rows);
}

async function lockedCaptainIdentityForIp(
  clientIp: string
): Promise<LockedCaptainIdentity | null> {
  const device = await getPortalDevice(clientIp);
  const fromDevice = lockedNotesFromPortalDevice(device);
  if (fromDevice && isLockedCaptainMapping({ source: "admin", notes: fromDevice.notes })) {
    return { captain_slot: fromDevice.captain_slot, notes: fromDevice.notes };
  }

  await ensureCaptainIpSchema();
  const rows = await sqlAll<
    Pick<CaptainIpMapping, "source" | "notes" | "captain_slot" | "last_seen_at">
  >(
    `SELECT source, notes, captain_slot, last_seen_at
     FROM captain_ip_mappings
     WHERE client_ip = ?
     ORDER BY last_seen_at DESC`,
    [clientIp.trim()]
  );
  return pickLockedCaptainIdentity(rows);
}

export async function recordCaptainIpInference(params: {
  clientIp: string;
  eventDate: string;
  sessionId?: string | null;
  authRole?: string | null;
}): Promise<void> {
  const ip = params.clientIp.trim();
  if (!ip || !isEventDate(params.eventDate)) return;

  await ensureCaptainIpSchema();
  const slot = defaultCaptainSlotForInference(params.eventDate);
  const isAdminLogin = params.authRole === "admin";
  const notes = isAdminLogin ? (await lockedAdminLabelForIp(ip)) ?? "" : "";
  const existing = await sqlGet<{ source: CaptainIpMappingSource; notes: string }>(
    "SELECT source, notes FROM captain_ip_mappings WHERE client_ip = ? AND event_date = ?",
    [ip, params.eventDate]
  );

  if (existing?.source === "admin" && !isAdminLogin) {
    await sqlRun(
      `UPDATE captain_ip_mappings SET
         visit_count = visit_count + 1,
         last_seen_at = datetime('now'),
         last_session_id = COALESCE(?, last_session_id),
         updated_at = datetime('now')
       WHERE client_ip = ? AND event_date = ?`,
      [params.sessionId ?? null, ip, params.eventDate]
    );
    return;
  }

  if (!isAdminLogin) {
    const guestLabel = await lockedGuestLabelForIp(ip);
    if (guestLabel) {
      await upsertCaptainIpMappingAdmin({
        clientIp: ip,
        eventDate: params.eventDate,
        captainSlot: slot,
        notes: guestLabel,
      });
      await sqlRun(
        `UPDATE captain_ip_mappings SET
           visit_count = visit_count + 1,
           last_seen_at = datetime('now'),
           last_session_id = COALESCE(?, last_session_id),
           updated_at = datetime('now')
         WHERE client_ip = ? AND event_date = ?`,
        [params.sessionId ?? null, ip, params.eventDate]
      );
      return;
    }

    const locked = await lockedCaptainIdentityForIp(ip);
    if (locked) {
      await upsertCaptainIpMappingAdmin({
        clientIp: ip,
        eventDate: params.eventDate,
        captainSlot: slot,
        notes: locked.notes,
      });
      await sqlRun(
        `UPDATE captain_ip_mappings SET
           visit_count = visit_count + 1,
           last_seen_at = datetime('now'),
           last_session_id = COALESCE(?, last_session_id),
           updated_at = datetime('now')
         WHERE client_ip = ? AND event_date = ?`,
        [params.sessionId ?? null, ip, params.eventDate]
      );
      return;
    }
  }

  if (isAdminLogin) {
    await sqlRun(
      `INSERT INTO captain_ip_mappings (
         client_ip, event_date, captain_slot, source, visit_count,
         last_seen_at, last_session_id, notes, updated_at
       ) VALUES (?, ?, ?, 'admin', 1, datetime('now'), ?, ?, datetime('now'))
       ON CONFLICT(client_ip, event_date) DO UPDATE SET
         visit_count = captain_ip_mappings.visit_count + 1,
         last_seen_at = datetime('now'),
         last_session_id = COALESCE(excluded.last_session_id, captain_ip_mappings.last_session_id),
         source = 'admin',
         captain_slot = excluded.captain_slot,
         notes = CASE
           WHEN excluded.notes != '' THEN excluded.notes
           WHEN captain_ip_mappings.notes != '' THEN captain_ip_mappings.notes
           ELSE ''
         END,
         updated_at = datetime('now')`,
      [ip, params.eventDate, slot, params.sessionId ?? null, notes]
    );
    return;
  }

  await sqlRun(
    `INSERT INTO captain_ip_mappings (
       client_ip, event_date, captain_slot, source, visit_count,
       last_seen_at, last_session_id, updated_at
     ) VALUES (?, ?, ?, 'inferred', 1, datetime('now'), ?, datetime('now'))
     ON CONFLICT(client_ip, event_date) DO UPDATE SET
       visit_count = captain_ip_mappings.visit_count + 1,
       last_seen_at = datetime('now'),
       last_session_id = COALESCE(excluded.last_session_id, captain_ip_mappings.last_session_id),
       source = CASE
         WHEN captain_ip_mappings.source = 'admin' THEN 'admin'
         ELSE 'inferred'
       END,
       captain_slot = CASE
         WHEN captain_ip_mappings.source = 'admin' THEN captain_ip_mappings.captain_slot
         ELSE excluded.captain_slot
       END,
       updated_at = datetime('now')`,
    [ip, params.eventDate, slot, params.sessionId ?? null]
  );
}

export async function listCaptainIpMappings(): Promise<CaptainIpMapping[]> {
  await ensureCaptainIpSchema();
  return sqlAll<CaptainIpMapping>(
    `SELECT client_ip, event_date, captain_slot, source, visit_count,
            last_seen_at, last_session_id, notes, device_id, created_at, updated_at
     FROM captain_ip_mappings
     ORDER BY event_date DESC, visit_count DESC, client_ip`
  );
}

export interface EnrichedCaptainIpMapping extends CaptainIpMapping {
  roster_captain_name: string;
  display_name: string;
}

/** Share of an IP's captain-role edits that must belong to one roster name. */
export const EDIT_IDENTITY_MAJORITY = 0.8;

/** One captain name if they have ≥80% of this IP's captain edits; otherwise null. */
export function majorityEditIdentity(
  edits: { captainName: string; count: number }[],
  threshold = EDIT_IDENTITY_MAJORITY
): string | null {
  const total = edits.reduce((sum, row) => sum + row.count, 0);
  if (total <= 0) return null;
  const top = [...edits].sort((a, b) => b.count - a.count || a.captainName.localeCompare(b.captainName))[0];
  const name = top?.captainName.trim() ?? "";
  if (!name || top.count / total < threshold) return null;
  return name;
}

export function captainIpDisplayName(
  row: Pick<CaptainIpMapping, "notes" | "event_date">,
  rosterCaptainName: string
): string {
  if (isAdminIdentifiedMapping(row)) return row.notes;
  if (isGuestIdentifiedMapping(row)) return guestDisplayNameFromNotes(row.notes);
  const manual = row.notes.trim();
  if (manual) return manual;
  if (rosterCaptainName.trim()) return rosterCaptainName.trim();
  return formatEventDate(row.event_date);
}

async function listRosterCaptainNamesByDateSlot(): Promise<Map<string, string>> {
  // Lean query — avoids dbReady() and per-date getDayCaptains stampede on Turso.
  try {
    const captains = await sqlAll<{
      event_date: string;
      captain_slot: string;
      name: string | null;
    }>(
      `SELECT event_date, captain_slot, name FROM day_captains
       WHERE TRIM(COALESCE(name, '')) != ''`
    );
    const rosterByDateSlot = new Map<string, string>();
    for (const captain of captains) {
      const name = captain.name?.trim() ?? "";
      if (!name) continue;
      rosterByDateSlot.set(`${captain.event_date}|${captain.captain_slot}`, name);
    }
    return rosterByDateSlot;
  } catch {
    // day_captains may be missing in isolated unit-test DBs.
    return new Map();
  }
}

export async function listEnrichedCaptainIpMappings(): Promise<EnrichedCaptainIpMapping[]> {
  const [rows, rosterByDateSlot] = await Promise.all([
    listCaptainIpMappings(),
    listRosterCaptainNamesByDateSlot(),
  ]);

  return rows.map((row) => {
    const roster_captain_name =
      rosterByDateSlot.get(`${row.event_date}|${row.captain_slot}`) ?? "";
    return {
      ...row,
      roster_captain_name,
      display_name: captainIpDisplayName(row, roster_captain_name),
    };
  });
}

export interface CaptainIpLookup {
  byIpAndDate: Map<string, string>;
  latestByIp: Map<string, { displayName: string; eventDate: string }>;
}

export function buildCaptainIpLookup(mappings: EnrichedCaptainIpMapping[]): CaptainIpLookup {
  const byIpAndDate = new Map<string, string>();
  const latestByIp = new Map<
    string,
    { displayName: string; eventDate: string; lastSeenAt: string }
  >();

  for (const row of mappings) {
    const ip = row.client_ip.trim();
    if (!ip) continue;

    byIpAndDate.set(`${ip}|${row.event_date}`, row.display_name);

    const prior = latestByIp.get(ip);
    const lastSeen = row.last_seen_at ?? "";
    if (!prior || lastSeen > prior.lastSeenAt) {
      latestByIp.set(ip, {
        displayName: row.display_name,
        eventDate: row.event_date,
        lastSeenAt: lastSeen,
      });
    }
  }

  return {
    byIpAndDate,
    latestByIp: new Map(
      [...latestByIp.entries()].map(([ip, value]) => [
        ip,
        { displayName: value.displayName, eventDate: value.eventDate },
      ])
    ),
  };
}

export function resolveCaptainNameFromIpLookup(
  lookup: CaptainIpLookup,
  clientIp: string | null | undefined,
  eventDate?: string | null
): string | null {
  const ip = clientIp?.trim();
  if (!ip) return null;

  const date = eventDate?.trim();
  if (date) {
    const exact = lookup.byIpAndDate.get(`${ip}|${date}`);
    if (exact) return exact;
  }

  return lookup.latestByIp.get(ip)?.displayName ?? null;
}

/** Portal Log who-label — anonymous sessions only get guest device names, not captain/admin IP tags. */
export function resolveCaptainNameForPortalSession(
  devices: PortalDevice[],
  mappings: Pick<CaptainIpMapping, "client_ip" | "notes" | "last_seen_at" | "source" | "captain_slot">[],
  lookup: CaptainIpLookup,
  clientIp: string | null | undefined,
  eventDate: string | null | undefined,
  authRole: string | null | undefined
): string | null {
  const ip = clientIp?.trim();
  if (!ip) return null;

  const device = devices.find((row) => row.client_ip.trim() === ip);
  const fromDevice = resolvePortalLogNameFromDevice(device, authRole);
  if (fromDevice) return fromDevice;

  if (!authRole?.trim()) {
    const guestLabel = pickLockedGuestLabel(mappings.filter((row) => row.client_ip.trim() === ip));
    if (guestLabel) return guestDisplayNameFromNotes(guestLabel);
    const captainLabel = pickLockedCaptainIdentity(
      mappings.filter((row) => row.client_ip.trim() === ip)
    );
    return captainLabel?.notes.trim() || null;
  }

  return resolveCaptainNameFromIpLookup(lookup, ip, eventDate);
}

interface CaptainIpVisitAggregate {
  client_ip: string;
  event_date: string;
  admin_visits: number;
  captain_visits: number;
  visit_count: number;
  last_seen_at: string;
  last_session_id: string | null;
}

async function listCaptainIpVisitAggregates(): Promise<CaptainIpVisitAggregate[]> {
  await ensureAnalyticsSchema();
  const { ensureAuditSchema } = await import("./audit-log");
  await ensureAuditSchema();
  return sqlAll<CaptainIpVisitAggregate>(
    `SELECT s.client_ip, a.event_date,
            SUM(CASE WHEN a.actor_role = 'admin' THEN 1 ELSE 0 END) as admin_visits,
            SUM(CASE WHEN a.actor_role = 'captain' THEN 1 ELSE 0 END) as captain_visits,
            COUNT(*) as visit_count,
            MAX(a.created_at) as last_seen_at,
            (
              SELECT a2.session_id FROM audit_log a2
              JOIN portal_sessions s2 ON s2.id = a2.session_id
              WHERE s2.client_ip = s.client_ip
                AND a2.event_date = a.event_date
                AND a2.actor_role IN ('captain', 'admin')
              ORDER BY a2.created_at DESC LIMIT 1
            ) as last_session_id
     FROM audit_log a
     JOIN portal_sessions s ON s.id = a.session_id
     WHERE a.actor_role IN ('captain', 'admin')
       AND s.client_ip IS NOT NULL AND s.client_ip != ''
       AND a.event_date IS NOT NULL AND TRIM(a.event_date) != ''
     GROUP BY s.client_ip, a.event_date`
  );
}

async function upsertCaptainIpMappingFromInference(params: {
  clientIp: string;
  eventDate: string;
  captainSlot: CaptainSlot;
  source: CaptainIpMappingSource;
  visitCount: number;
  lastSeenAt: string;
  lastSessionId: string | null;
  notes: string;
  preserveIdentity?: boolean;
}): Promise<void> {
  await ensureCaptainIpSchema();
  if (params.preserveIdentity) {
    await sqlRun(
      `INSERT INTO captain_ip_mappings (
         client_ip, event_date, captain_slot, source, visit_count,
         last_seen_at, last_session_id, notes, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(client_ip, event_date) DO UPDATE SET
         visit_count = excluded.visit_count,
         last_seen_at = excluded.last_seen_at,
         last_session_id = excluded.last_session_id,
         updated_at = datetime('now')`,
      [
        params.clientIp,
        params.eventDate,
        params.captainSlot,
        params.source,
        params.visitCount,
        params.lastSeenAt,
        params.lastSessionId,
        params.notes,
      ]
    );
    return;
  }

  await sqlRun(
    `INSERT INTO captain_ip_mappings (
       client_ip, event_date, captain_slot, source, visit_count,
       last_seen_at, last_session_id, notes, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(client_ip, event_date) DO UPDATE SET
       captain_slot = excluded.captain_slot,
       source = excluded.source,
       visit_count = excluded.visit_count,
       last_seen_at = excluded.last_seen_at,
       last_session_id = excluded.last_session_id,
       notes = excluded.notes,
       updated_at = datetime('now')`,
    [
      params.clientIp,
      params.eventDate,
      params.captainSlot,
      params.source,
      params.visitCount,
      params.lastSeenAt,
      params.lastSessionId,
      params.notes,
    ]
  );
}

export interface CaptainIpInferenceRerunResult {
  processed: number;
  adminTagged: number;
  captainInferred: number;
  manualPreserved: number;
  lockedApplied: number;
  guestApplied: number;
  staleRemoved: number;
  identitiesApplied: number;
}

/** Rebuild inferred mappings from captain/admin *edits* on a event day (not page views). */
export async function rerunCaptainIpInference(): Promise<CaptainIpInferenceRerunResult> {
  const [aggregates, existing] = await Promise.all([
    listCaptainIpVisitAggregates(),
    listCaptainIpMappings(),
  ]);
  const existingByKey = new Map(
    existing.map((row) => [`${row.client_ip}|${row.event_date}`, row])
  );
  const rowsByIp = new Map<string, CaptainIpMapping[]>();
  for (const row of existing) {
    const ip = row.client_ip.trim();
    if (!ip) continue;
    const bucket = rowsByIp.get(ip) ?? [];
    bucket.push(row);
    rowsByIp.set(ip, bucket);
  }
  const lockedByIp = new Map<string, LockedCaptainIdentity>();
  const guestLockedByIp = new Map<string, string>();
  const adminLockedByIp = new Map<string, string>();
  for (const [ip, rows] of rowsByIp) {
    const identity = pickLockedCaptainIdentity(rows);
    if (identity) lockedByIp.set(ip, identity);
    const guestLabel = pickLockedGuestLabel(rows);
    if (guestLabel) guestLockedByIp.set(ip, guestLabel);
    const adminLabel = pickLockedAdminLabel(rows);
    if (adminLabel) adminLockedByIp.set(ip, adminLabel);
  }
  const processedKeys = new Set<string>();

  await sqlRun("DELETE FROM captain_ip_mappings WHERE source = 'inferred'");

  let adminTagged = 0;
  let captainInferred = 0;
  let manualPreserved = 0;
  let lockedApplied = 0;
  let guestApplied = 0;

  for (const group of aggregates) {
    const ip = group.client_ip.trim();
    if (!ip || !isEventDate(group.event_date)) continue;

    const key = `${ip}|${group.event_date}`;
    processedKeys.add(key);
    const slot = defaultCaptainSlotForInference(group.event_date);
    const prior = existingByKey.get(key);

    if (group.admin_visits > 0) {
      const priorAdminNotes =
        prior?.source === "admin" && isAdminIdentifiedMapping(prior) ? prior.notes : null;
      const notes = priorAdminNotes ?? adminLockedByIp.get(ip) ?? "";
      await upsertCaptainIpMappingFromInference({
        clientIp: ip,
        eventDate: group.event_date,
        captainSlot: slot,
        source: "admin",
        visitCount: group.visit_count,
        lastSeenAt: group.last_seen_at,
        lastSessionId: group.last_session_id,
        notes,
      });
      adminTagged += 1;
      continue;
    }

    if (group.captain_visits <= 0) continue;

    if (prior?.source === "admin") {
      await upsertCaptainIpMappingFromInference({
        clientIp: ip,
        eventDate: group.event_date,
        captainSlot: prior.captain_slot,
        source: prior.source,
        visitCount: group.visit_count,
        lastSeenAt: group.last_seen_at,
        lastSessionId: group.last_session_id,
        notes: prior.notes,
        preserveIdentity: true,
      });
      manualPreserved += 1;
      continue;
    }

    const guestLabel = guestLockedByIp.get(ip);
    if (guestLabel) {
      await upsertCaptainIpMappingFromInference({
        clientIp: ip,
        eventDate: group.event_date,
        captainSlot: slot,
        source: "admin",
        visitCount: group.captain_visits || group.visit_count,
        lastSeenAt: group.last_seen_at,
        lastSessionId: group.last_session_id,
        notes: guestLabel,
      });
      guestApplied += 1;
      continue;
    }

    const locked = lockedByIp.get(ip);
    if (locked) {
      await upsertCaptainIpMappingFromInference({
        clientIp: ip,
        eventDate: group.event_date,
        captainSlot: slot,
        source: "admin",
        visitCount: group.captain_visits,
        lastSeenAt: group.last_seen_at,
        lastSessionId: group.last_session_id,
        notes: locked.notes,
      });
      lockedApplied += 1;
      continue;
    }

    await upsertCaptainIpMappingFromInference({
      clientIp: ip,
      eventDate: group.event_date,
      captainSlot: slot,
      source: "inferred",
      visitCount: group.captain_visits,
      lastSeenAt: group.last_seen_at,
      lastSessionId: group.last_session_id,
      notes: "",
    });
    captainInferred += 1;
  }

  let staleRemoved = 0;
  for (const row of existing) {
    const key = `${row.client_ip}|${row.event_date}`;
    if (processedKeys.has(key)) continue;
    const unnamedAdmin = row.source === "admin" && row.notes.trim() === "";
    if (row.source === "inferred" || unnamedAdmin) {
      await deleteCaptainIpMapping(row.client_ip, row.event_date);
      staleRemoved += 1;
    }
  }

  const identitiesApplied = await applyMajorityEditIdentities(aggregates);

  return {
    processed: aggregates.length,
    adminTagged,
    captainInferred,
    manualPreserved,
    lockedApplied,
    guestApplied,
    staleRemoved,
    identitiesApplied,
  };
}

async function applyMajorityEditIdentities(
  aggregates: CaptainIpVisitAggregate[]
): Promise<number> {
  const roster = await listRosterCaptainNamesByDateSlot();
  const byIp = new Map<
    string,
    Map<string, { count: number; eventDate: string; captainSlot: CaptainSlot; lastSeenAt: string }>
  >();

  for (const group of aggregates) {
    if (group.admin_visits > 0 || group.captain_visits <= 0) continue;
    const ip = group.client_ip.trim();
    if (!ip || !isEventDate(group.event_date)) continue;
    const slot = defaultCaptainSlotForInference(group.event_date);
    const captainName = roster.get(`${group.event_date}|${slot}`)?.trim() ?? "";
    if (!captainName) continue;
    const names = byIp.get(ip) ?? new Map();
    const prior = names.get(captainName);
    const newer = !prior || group.last_seen_at > prior.lastSeenAt;
    names.set(captainName, {
      count: (prior?.count ?? 0) + group.captain_visits,
      eventDate: newer ? group.event_date : prior.eventDate,
      captainSlot: newer ? slot : prior.captainSlot,
      lastSeenAt: newer ? group.last_seen_at : prior.lastSeenAt,
    });
    byIp.set(ip, names);
  }

  let applied = 0;
  for (const [ip, names] of byIp) {
    const identity = majorityEditIdentity(
      [...names.entries()].map(([captainName, row]) => ({
        captainName,
        count: row.count,
      }))
    );
    if (!identity) continue;
    const existing = await getPortalDevice(ip);
    if (isConfirmedPortalDevice(existing)) continue;
    const top = names.get(identity);
    if (!top) continue;
    await upsertConfirmedPortalDevice({
      clientIp: ip,
      notes: identity,
      captainSlot: top.captainSlot,
      lastSeenAt: top.lastSeenAt,
    });
    await applyCaptainMappingToIp(ip, {
      eventDate: top.eventDate,
      captainSlot: top.captainSlot,
      notes: identity,
    });
    applied += 1;
  }
  return applied;
}

/** Captain sessions on day pages not yet mapped (or only weak signals). */
export async function listCaptainIpVisitSignals(limit = 50): Promise<CaptainIpVisitSignal[]> {
  await ensureAnalyticsSchema();
  return sqlAll<CaptainIpVisitSignal>(
    `SELECT s.client_ip, e.event_date,
            COUNT(*) as visit_count,
            MAX(e.created_at) as last_seen_at,
            (
              SELECT e2.session_id FROM portal_events e2
              JOIN portal_sessions s2 ON s2.id = e2.session_id
              WHERE s2.client_ip = s.client_ip
                AND e2.event_date = e.event_date
                AND s2.auth_role = 'captain'
                AND e2.path LIKE '/day/%'
              ORDER BY e2.created_at DESC LIMIT 1
            ) as last_session_id
     FROM portal_events e
     JOIN portal_sessions s ON s.id = e.session_id
     WHERE s.auth_role = 'captain'
       AND s.client_ip IS NOT NULL AND s.client_ip != ''
       AND e.event_date IS NOT NULL
       AND e.path LIKE '/day/%'
       AND e.event_type IN ('page_view', 'navigation')
       AND NOT EXISTS (
         SELECT 1 FROM portal_events e2
         JOIN portal_sessions s2 ON s2.id = e2.session_id
         WHERE s2.client_ip = s.client_ip
           AND e2.event_date = e.event_date
           AND s2.auth_role = 'admin'
           AND e2.path LIKE '/day/%'
           AND e2.event_type IN ('page_view', 'navigation')
       )
     GROUP BY s.client_ip, e.event_date
     ORDER BY last_seen_at DESC
     LIMIT ?`,
    [limit]
  );
}

/** Admin sessions on day pages — assign the admin identity on Captain IPs. */
export async function listAdminIpVisitSignals(limit = 50): Promise<CaptainIpVisitSignal[]> {
  await ensureAnalyticsSchema();
  return sqlAll<CaptainIpVisitSignal>(
    `SELECT s.client_ip, e.event_date,
            COUNT(*) as visit_count,
            MAX(e.created_at) as last_seen_at,
            (
              SELECT e2.session_id FROM portal_events e2
              JOIN portal_sessions s2 ON s2.id = e2.session_id
              WHERE s2.client_ip = s.client_ip
                AND e2.event_date = e.event_date
                AND s2.auth_role = 'admin'
                AND e2.path LIKE '/day/%'
              ORDER BY e2.created_at DESC LIMIT 1
            ) as last_session_id
     FROM portal_events e
     JOIN portal_sessions s ON s.id = e.session_id
     WHERE s.auth_role = 'admin'
       AND s.client_ip IS NOT NULL AND s.client_ip != ''
       AND e.event_date IS NOT NULL
       AND e.path LIKE '/day/%'
       AND e.event_type IN ('page_view', 'navigation')
     GROUP BY s.client_ip, e.event_date
     ORDER BY last_seen_at DESC
     LIMIT ?`,
    [limit]
  );
}

export function ipHasAdminLabel(
  mappings: Pick<CaptainIpMapping, "client_ip" | "notes">[],
  clientIp: string
): boolean {
  const ip = clientIp.trim();
  return mappings.some((row) => row.client_ip.trim() === ip && isAdminIdentifiedMapping(row));
}

/** True when an IP has an admin-confirmed captain, guest name, or admin device label. */
export function ipHasConfirmedAssignment(
  devices: Pick<PortalDevice, "client_ip" | "source" | "notes">[],
  mappings: Pick<CaptainIpMapping, "client_ip" | "source" | "notes">[],
  clientIp: string
): boolean {
  if (ipHasConfirmedDevice(devices, clientIp)) return true;

  const ip = clientIp.trim();
  return mappings
    .filter((row) => row.client_ip.trim() === ip)
    .some(
      (row) =>
        isLockedCaptainMapping(row) ||
        isLockedGuestMapping(row) ||
        isAdminIdentifiedMapping(row)
    );
}

export interface UnmappedPortalIpSignal {
  client_ip: string;
  session_count: number;
  first_seen_at: string;
  last_seen_at: string;
  last_auth_role: string | null;
  first_event_date: string | null;
  day_visit_count: number;
  day_event_dates: string[];
}

type UnmappedPortalIpSignalRow = Omit<UnmappedPortalIpSignal, "day_event_dates"> & {
  day_event_dates: string | null;
};

export function parseUnmappedDayEventDates(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const dates = raw
    .split(",")
    .map((d) => d.trim())
    .filter((d) => isEventDate(d));
  return [...new Set(dates)].sort();
}

export function formatUnmappedDayVisits(dates: readonly string[]): string {
  if (!dates.length) return "—";
  return dates.map((d) => formatEventDate(d)).join(" · ");
}

/** Portal IPs without a confirmed captain, guest, or admin label. */
export async function listUnmappedPortalIpSignals(
  devices: Pick<PortalDevice, "client_ip" | "source" | "notes">[],
  mappings: Pick<CaptainIpMapping, "client_ip" | "source" | "notes">[],
  limit = 80
): Promise<UnmappedPortalIpSignal[]> {
  await ensureAnalyticsSchema();
  const rows = await sqlAll<UnmappedPortalIpSignalRow>(
    `SELECT s.client_ip,
            COUNT(DISTINCT s.id) AS session_count,
            MIN(s.started_at) AS first_seen_at,
            MAX(s.last_seen_at) AS last_seen_at,
            (
              SELECT s2.auth_role FROM portal_sessions s2
              WHERE s2.client_ip = s.client_ip
              ORDER BY datetime(s2.last_seen_at) DESC LIMIT 1
            ) AS last_auth_role,
            (
              SELECT e.event_date FROM portal_events e
              INNER JOIN portal_sessions s3 ON s3.id = e.session_id
              WHERE s3.client_ip = s.client_ip
                AND e.event_date IS NOT NULL
              ORDER BY datetime(e.created_at) ASC LIMIT 1
            ) AS first_event_date,
            (
              SELECT COUNT(*) FROM portal_events e
              INNER JOIN portal_sessions s4 ON s4.id = e.session_id
              WHERE s4.client_ip = s.client_ip
                AND e.path LIKE '/day/%'
                AND e.event_type IN ('page_view', 'navigation')
            ) AS day_visit_count,
            (
              SELECT GROUP_CONCAT(DISTINCT visit_day)
              FROM (
                SELECT COALESCE(
                  NULLIF(TRIM(e.event_date), ''),
                  CASE WHEN e.path GLOB '/day/????-??-??*' THEN substr(e.path, 6, 10) ELSE NULL END
                ) AS visit_day
                FROM portal_events e
                INNER JOIN portal_sessions s5 ON s5.id = e.session_id
                WHERE s5.client_ip = s.client_ip
                  AND e.path LIKE '/day/%'
                  AND e.event_type IN ('page_view', 'navigation')
              )
              WHERE visit_day IS NOT NULL AND visit_day GLOB '????-??-??'
            ) AS day_event_dates
     FROM portal_sessions s
     WHERE s.client_ip IS NOT NULL AND TRIM(s.client_ip) != ''
     GROUP BY s.client_ip
     ORDER BY datetime(MAX(s.last_seen_at)) DESC
     LIMIT ?`,
    [limit]
  );
  return rows
    .filter((row) => !ipHasConfirmedAssignment(devices, mappings, row.client_ip))
    .map((row) => ({
      ...row,
      day_event_dates: parseUnmappedDayEventDates(row.day_event_dates),
    }));
}

export function anchorEventDateForUnmappedIp(
  signal: Pick<UnmappedPortalIpSignal, "first_event_date">,
  fallbackEventDate: string
): string {
  const first = signal.first_event_date?.trim();
  return first && isEventDate(first) ? first : fallbackEventDate;
}

export function suggestCaptainKeyForUnmappedIp(
  signal: Pick<UnmappedPortalIpSignal, "last_auth_role" | "first_event_date">,
  options: DayCaptainOption[]
): string {
  const role = signal.last_auth_role?.trim().toLowerCase();
  if (role === "admin") {
    return encodeAdminCaptainKey(PORTAL_ADMIN_NAMES[0]);
  }
  const eventDate = signal.first_event_date?.trim();
  if (role === "captain" && eventDate && isEventDate(eventDate)) {
    return dayCaptainOptionsForDate(options, eventDate)[0]?.key ?? GUEST_DAY_CAPTAIN_KEY;
  }
  if (eventDate && isEventDate(eventDate)) {
    const dayOptions = dayCaptainOptionsForDate(options, eventDate);
    if (dayOptions.length > 0) return dayOptions[0].key;
  }
  return GUEST_DAY_CAPTAIN_KEY;
}

export function unmappedIpRoleLabel(authRole: string | null): string {
  switch (authRole?.trim().toLowerCase()) {
    case "admin":
      return "Admin";
    case "captain":
      return "Captain";
    case "volunteer":
      return "Volunteer";
    case "pi":
      return "PI";
    default:
      return authRole?.trim() || "Unknown";
  }
}

export async function upsertCaptainIpMappingAdmin(params: {
  clientIp: string;
  eventDate: string;
  captainSlot: CaptainSlot;
  notes?: string;
}): Promise<void> {
  const ip = params.clientIp.trim();
  if (!ip || !isEventDate(params.eventDate)) return;

  const slots = getCaptainSlotsForDate(params.eventDate).map((s) => s.slot);
  if (!slots.includes(params.captainSlot)) {
    throw new Error("Invalid captain slot for event date");
  }

  await ensureCaptainIpSchema();
  const notes = params.notes ?? "";
  await sqlRun(
    `INSERT INTO captain_ip_mappings (
       client_ip, event_date, captain_slot, source, visit_count,
       last_seen_at, notes, updated_at
     ) VALUES (?, ?, ?, 'admin', COALESCE(
       (SELECT visit_count FROM captain_ip_mappings WHERE client_ip = ? AND event_date = ?), 0
     ), datetime('now'), ?, datetime('now'))
     ON CONFLICT(client_ip, event_date) DO UPDATE SET
       captain_slot = excluded.captain_slot,
       source = 'admin',
       notes = excluded.notes,
       updated_at = datetime('now')`,
    [ip, params.eventDate, params.captainSlot, ip, params.eventDate, notes]
  );
  if (notes.trim()) {
    await upsertConfirmedPortalDevice({
      clientIp: ip,
      notes,
      captainSlot: params.captainSlot,
    });
  }
}

export async function deleteCaptainIpMapping(clientIp: string, eventDate: string): Promise<void> {
  await ensureCaptainIpSchema();
  await sqlRun("DELETE FROM captain_ip_mappings WHERE client_ip = ? AND event_date = ?", [
    clientIp.trim(),
    eventDate,
  ]);
}

/** Apply one captain identity to every visit-day row for a static IP. */
export async function applyCaptainMappingToIp(
  clientIp: string,
  resolved: { eventDate: string; captainSlot: CaptainSlot; notes: string }
): Promise<void> {
  const ip = clientIp.trim();
  if (!ip) return;

  const rows = (await listCaptainIpMappings()).filter((row) => row.client_ip.trim() === ip);

  if (rows.length === 0) {
    await upsertCaptainIpMappingAdmin({
      clientIp: ip,
      eventDate: resolved.eventDate,
      captainSlot: resolved.captainSlot,
      notes: resolved.notes,
    });
    return;
  }

  for (const row of rows) {
    await upsertCaptainIpMappingAdmin({
      clientIp: ip,
      eventDate: row.event_date,
      captainSlot: row.captain_slot,
      notes: resolved.notes,
    });
  }
}

export async function deleteAllCaptainIpMappings(clientIp: string): Promise<void> {
  await ensureCaptainIpSchema();
  await sqlRun("DELETE FROM captain_ip_mappings WHERE client_ip = ?", [clientIp.trim()]);
  await deletePortalDevice(clientIp);
}