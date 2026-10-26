import type { CaptainSlot } from "./day-captain-slots";
import {
  guestDisplayNameFromNotes,
  isAdminIdentifiedMapping,
  isGuestIdentifiedMapping,
} from "./captain-ip-mapping-keys";
import { sqlAll, sqlGet, sqlRun } from "./db-client";
import { formatParsedUserAgent, parseUserAgent } from "./user-agent";

export type PortalDeviceSource = "admin";

export interface PortalDevice {
  client_ip: string;
  notes: string;
  captain_slot: CaptainSlot;
  source: PortalDeviceSource | null;
  confirmed_at: string | null;
  last_seen_at: string | null;
  user_agent: string | null;
  browser: string | null;
  browser_version: string | null;
  platform: string | null;
  is_mobile: number;
  created_at: string;
  updated_at: string;
}

const PORTAL_DEVICE_SELECT = `client_ip, notes, captain_slot, source, confirmed_at, last_seen_at,
  user_agent, browser, browser_version, platform, is_mobile, created_at, updated_at`;

function telemetryFromUserAgent(userAgent: string | null | undefined): {
  user_agent: string | null;
  browser: string | null;
  browser_version: string | null;
  platform: string | null;
  is_mobile: number;
} {
  const parsed = parseUserAgent(userAgent);
  if (parsed.browser === "—") {
    return {
      user_agent: userAgent?.trim() || null,
      browser: null,
      browser_version: null,
      platform: null,
      is_mobile: 0,
    };
  }
  return {
    user_agent: userAgent?.trim().slice(0, 500) || null,
    browser: parsed.browser,
    browser_version: parsed.browserVersion,
    platform: parsed.platform,
    is_mobile: parsed.isMobile ? 1 : 0,
  };
}

export function formatPortalDeviceTelemetry(
  device: Pick<
    PortalDevice,
    "browser" | "browser_version" | "platform" | "is_mobile" | "user_agent"
  > | null | undefined
): string {
  if (!device) return "—";
  if (device.browser) {
    return formatParsedUserAgent({
      browser: device.browser,
      device: device.platform ?? "—",
      platform: device.platform ?? "—",
      browserVersion: device.browser_version,
      isMobile: device.is_mobile === 1,
    });
  }
  if (device.user_agent?.trim()) return device.user_agent.trim().slice(0, 80);
  return "—";
}

type MappingIdentityRow = {
  source: string;
  notes: string;
  captain_slot: CaptainSlot;
  last_seen_at: string | null;
};

let schemaReady = false;
let backfillDone = false;

function isLockedCaptainRow(row: Pick<MappingIdentityRow, "source" | "notes">): boolean {
  return (
    row.source === "admin" &&
    row.notes.trim() !== "" &&
    !isAdminIdentifiedMapping(row) &&
    !isGuestIdentifiedMapping(row)
  );
}

function isLockedGuestRow(row: Pick<MappingIdentityRow, "source" | "notes">): boolean {
  return row.source === "admin" && isGuestIdentifiedMapping(row);
}

export function isConfirmedPortalDevice(
  device: Pick<PortalDevice, "source" | "notes"> | null | undefined
): boolean {
  if (!device || device.source !== "admin") return false;
  return device.notes.trim() !== "";
}

export function portalDeviceDisplayName(device: Pick<PortalDevice, "notes">): string {
  const notes = device.notes.trim();
  if (isAdminIdentifiedMapping({ notes })) return notes;
  if (isGuestIdentifiedMapping({ notes })) return guestDisplayNameFromNotes(notes);
  return notes;
}

/**
 * DDL only — never run migration backfills here.
 * Backfills were N+1 Turso round-trips and made every serverless cold start
 * (portal log, captain IPs) take ~10s.
 */
export async function ensurePortalDeviceSchema(): Promise<void> {
  if (schemaReady) return;
  await sqlRun(`
    CREATE TABLE IF NOT EXISTS portal_devices (
      client_ip TEXT PRIMARY KEY,
      notes TEXT NOT NULL DEFAULT '',
      captain_slot TEXT NOT NULL DEFAULT 'full',
      source TEXT,
      confirmed_at TEXT,
      last_seen_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  try {
    await sqlRun("ALTER TABLE captain_ip_mappings ADD COLUMN device_id TEXT");
  } catch {
    /* column exists */
  }
  await sqlRun(
    "CREATE INDEX IF NOT EXISTS idx_captain_ip_mappings_device ON captain_ip_mappings(device_id)"
  );
  for (const col of [
    "user_agent TEXT",
    "browser TEXT",
    "browser_version TEXT",
    "platform TEXT",
    "is_mobile INTEGER NOT NULL DEFAULT 0",
  ]) {
    try {
      await sqlRun(`ALTER TABLE portal_devices ADD COLUMN ${col}`);
    } catch {
      /* column exists */
    }
  }
  schemaReady = true;
}

/**
 * One-time migration helpers (legacy mapping → portal_devices, session UA telemetry).
 * Not called on read paths — live writes go through upsertConfirmedPortalDevice /
 * touchPortalDeviceTelemetry.
 */
export async function runPortalDeviceBackfillsOnce(): Promise<void> {
  await ensurePortalDeviceSchema();
  if (backfillDone) return;
  backfillDone = true;
  await backfillPortalDevicesFromMappings();
  await backfillPortalDeviceTelemetryFromSessions();
}

/** Latest UA snapshot per IP — does not change confirmed identity fields. */
export async function touchPortalDeviceTelemetry(params: {
  clientIp: string;
  userAgent?: string | null;
  lastSeenAt?: string | null;
}): Promise<void> {
  const ip = params.clientIp.trim();
  if (!ip) return;
  await ensurePortalDeviceSchema();

  const telemetry = telemetryFromUserAgent(params.userAgent);
  if (!telemetry.user_agent && !telemetry.browser) return;

  await sqlRun(
    `INSERT INTO portal_devices (
       client_ip, notes, captain_slot, user_agent, browser, browser_version, platform, is_mobile,
       last_seen_at, updated_at
     ) VALUES (?, '', 'full', ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), datetime('now'))
     ON CONFLICT(client_ip) DO UPDATE SET
       user_agent = excluded.user_agent,
       browser = excluded.browser,
       browser_version = excluded.browser_version,
       platform = excluded.platform,
       is_mobile = excluded.is_mobile,
       last_seen_at = COALESCE(excluded.last_seen_at, portal_devices.last_seen_at),
       updated_at = datetime('now')`,
    [
      ip,
      telemetry.user_agent,
      telemetry.browser,
      telemetry.browser_version,
      telemetry.platform,
      telemetry.is_mobile,
      params.lastSeenAt ?? null,
    ]
  );
}

/** One confirmed label per IP — source of truth for device identity. */
export async function upsertConfirmedPortalDevice(params: {
  clientIp: string;
  notes: string;
  captainSlot: CaptainSlot;
  lastSeenAt?: string | null;
}): Promise<void> {
  const ip = params.clientIp.trim();
  if (!ip) return;
  await ensurePortalDeviceSchema();
  const notes = params.notes.trim();
  if (!notes) {
    await sqlRun("DELETE FROM portal_devices WHERE client_ip = ?", [ip]);
    await sqlRun("UPDATE captain_ip_mappings SET device_id = NULL WHERE client_ip = ?", [ip]);
    return;
  }

  await sqlRun(
    `INSERT INTO portal_devices (
       client_ip, notes, captain_slot, source, confirmed_at, last_seen_at, updated_at
     ) VALUES (?, ?, ?, 'admin', datetime('now'), COALESCE(?, datetime('now')), datetime('now'))
     ON CONFLICT(client_ip) DO UPDATE SET
       notes = excluded.notes,
       captain_slot = excluded.captain_slot,
       source = 'admin',
       confirmed_at = COALESCE(portal_devices.confirmed_at, excluded.confirmed_at),
       last_seen_at = COALESCE(excluded.last_seen_at, portal_devices.last_seen_at),
       updated_at = datetime('now')`,
    [ip, notes, params.captainSlot, params.lastSeenAt ?? null]
  );
  await sqlRun("UPDATE captain_ip_mappings SET device_id = ? WHERE client_ip = ?", [ip, ip]);
}

export async function getPortalDevice(clientIp: string): Promise<PortalDevice | null> {
  await ensurePortalDeviceSchema();
  const row = await sqlGet<PortalDevice>(
    `SELECT ${PORTAL_DEVICE_SELECT} FROM portal_devices WHERE client_ip = ?`,
    [clientIp.trim()]
  );
  return row ?? null;
}

export async function listPortalDevices(): Promise<PortalDevice[]> {
  await ensurePortalDeviceSchema();
  return sqlAll<PortalDevice>(
    `SELECT ${PORTAL_DEVICE_SELECT}
     FROM portal_devices
     ORDER BY datetime(last_seen_at) DESC, client_ip`
  );
}

export async function deletePortalDevice(clientIp: string): Promise<void> {
  await ensurePortalDeviceSchema();
  const ip = clientIp.trim();
  await sqlRun("DELETE FROM portal_devices WHERE client_ip = ?", [ip]);
  await sqlRun("UPDATE captain_ip_mappings SET device_id = NULL WHERE client_ip = ?", [ip]);
}

export function ipHasConfirmedDevice(
  devices: Pick<PortalDevice, "client_ip" | "source" | "notes">[],
  clientIp: string
): boolean {
  const ip = clientIp.trim();
  const device = devices.find((row) => row.client_ip.trim() === ip);
  return isConfirmedPortalDevice(device);
}

export function lockedNotesFromPortalDevice(
  device: Pick<PortalDevice, "notes" | "captain_slot" | "source"> | null | undefined
): { notes: string; captain_slot: CaptainSlot } | null {
  if (!isConfirmedPortalDevice(device)) return null;
  return {
    notes: device!.notes,
    captain_slot: device!.captain_slot,
  };
}

export function resolvePortalLogNameFromDevice(
  device: Pick<PortalDevice, "notes" | "source"> | null | undefined,
  authRole: string | null | undefined
): string | null {
  if (!isConfirmedPortalDevice(device)) return null;
  if (!authRole?.trim()) {
    if (isGuestIdentifiedMapping(device!)) return guestDisplayNameFromNotes(device!.notes);
    if (isAdminIdentifiedMapping(device!)) return null;
    return portalDeviceDisplayName(device!);
  }
  if (isAdminIdentifiedMapping(device!)) return device!.notes;
  return portalDeviceDisplayName(device!);
}

function pickBestMappingForDevice(rows: MappingIdentityRow[]): MappingIdentityRow | null {
  const lockedCaptain = rows
    .filter(isLockedCaptainRow)
    .sort((a, b) => (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? ""))[0];
  if (lockedCaptain) return lockedCaptain;

  const lockedAdmin = rows
    .filter((row) => row.source === "admin" && isAdminIdentifiedMapping(row))
    .sort((a, b) => (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? ""))[0];
  if (lockedAdmin) return lockedAdmin;

  const lockedGuest = rows
    .filter(isLockedGuestRow)
    .sort((a, b) => (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? ""))[0];
  if (lockedGuest) return lockedGuest;

  return null;
}

/** Migrate legacy per-day mapping notes into portal_devices. */
export async function backfillPortalDevicesFromMappings(): Promise<void> {
  const ips = await sqlAll<{ client_ip: string }>(
    `SELECT DISTINCT client_ip FROM captain_ip_mappings WHERE TRIM(client_ip) != ''`
  );

  for (const { client_ip } of ips) {
    const existing = await sqlGet<PortalDevice>(
      `SELECT ${PORTAL_DEVICE_SELECT} FROM portal_devices WHERE client_ip = ?`,
      [client_ip]
    );
    if (isConfirmedPortalDevice(existing)) {
      await sqlRun(
        "UPDATE captain_ip_mappings SET device_id = ? WHERE client_ip = ?",
        [client_ip, client_ip]
      );
      continue;
    }

    const rows = await sqlAll<MappingIdentityRow>(
      `SELECT source, notes, captain_slot, last_seen_at
       FROM captain_ip_mappings
       WHERE client_ip = ?
       ORDER BY last_seen_at DESC`,
      [client_ip]
    );
    const best = pickBestMappingForDevice(rows);
    if (!best?.notes.trim()) continue;

    await upsertConfirmedPortalDevice({
      clientIp: client_ip,
      notes: best.notes,
      captainSlot: best.captain_slot,
      lastSeenAt: best.last_seen_at,
    });
  }
}

/** Roll up latest session UA per IP into portal_devices telemetry columns. */
export async function backfillPortalDeviceTelemetryFromSessions(): Promise<void> {
  const rows = await sqlAll<{ client_ip: string; user_agent: string | null; last_seen_at: string }>(
    `SELECT s.client_ip, s.user_agent, s.last_seen_at
     FROM portal_sessions s
     INNER JOIN (
       SELECT client_ip, MAX(datetime(last_seen_at)) AS max_seen
       FROM portal_sessions
       WHERE TRIM(COALESCE(client_ip, '')) != ''
       GROUP BY client_ip
     ) latest ON latest.client_ip = s.client_ip AND datetime(s.last_seen_at) = latest.max_seen
     WHERE TRIM(COALESCE(s.user_agent, '')) != ''`
  );

  for (const row of rows) {
    await touchPortalDeviceTelemetry({
      clientIp: row.client_ip,
      userAgent: row.user_agent,
      lastSeenAt: row.last_seen_at,
    });
  }
}
