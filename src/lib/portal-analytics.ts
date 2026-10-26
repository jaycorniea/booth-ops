import type { ClientGeo } from "./client-geo";
import { sqlAll, sqlGet, sqlRun } from "./db-client";

export const SESSION_ID_COOKIE = "booth_portal_sid";

export type PortalEventType = "auth" | "page_view" | "navigation" | "mutation" | "api" | "error";

export interface PortalSession {
  id: string;
  started_at: string;
  last_seen_at: string;
  ended_at: string | null;
  user_agent: string;
  client_ip: string | null;
  entry_path: string | null;
  auth_role: string | null;
  referrer: string | null;
  geo_country: string | null;
  geo_region: string | null;
  geo_city: string | null;
  geo_timezone: string | null;
  geo_latitude: number | null;
  geo_longitude: number | null;
  geo_accuracy: number | null;
  geo_source: string | null;
}

export interface PortalEvent {
  id: number;
  session_id: string;
  event_type: PortalEventType;
  action: string;
  event_date: string | null;
  path: string | null;
  detail: string | null;
  created_at: string;
}

export interface PortalActivitySummary {
  activeSessions: number;
  sessionsToday: number;
  loginsToday: number;
  mutationsToday: number;
  pageViewsToday: number;
  byAction: { action: string; count: number }[];
}

let schemaReady = false;

async function migratePortalSessionColumns(): Promise<void> {
  const columns = [
    "client_ip TEXT",
    "entry_path TEXT",
    "auth_role TEXT",
    "referrer TEXT",
    "geo_country TEXT",
    "geo_region TEXT",
    "geo_city TEXT",
    "geo_timezone TEXT",
    "geo_latitude REAL",
    "geo_longitude REAL",
    "geo_accuracy REAL",
    "geo_source TEXT",
  ];
  for (const col of columns) {
    try {
      await sqlRun(`ALTER TABLE portal_sessions ADD COLUMN ${col}`);
    } catch {
      /* column exists */
    }
  }
}

async function migratePortalEventColumns(): Promise<void> {
  try {
    await sqlRun("ALTER TABLE portal_events ADD COLUMN client_ip TEXT");
  } catch {
    /* column exists */
  }
}

export async function ensureAnalyticsSchema(): Promise<void> {
  if (schemaReady) return;
  await sqlRun(`
    CREATE TABLE IF NOT EXISTS portal_sessions (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT,
      user_agent TEXT DEFAULT '',
      client_ip TEXT,
      entry_path TEXT,
      auth_role TEXT,
      referrer TEXT
    )
  `);
  await migratePortalSessionColumns();
  await sqlRun(`
    CREATE TABLE IF NOT EXISTS portal_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      action TEXT NOT NULL,
      event_date TEXT,
      path TEXT,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES portal_sessions(id)
    )
  `);
  await migratePortalEventColumns();
  await sqlRun(
    "CREATE INDEX IF NOT EXISTS idx_portal_events_session ON portal_events(session_id, created_at)"
  );
  await sqlRun(
    "CREATE INDEX IF NOT EXISTS idx_portal_events_created ON portal_events(created_at)"
  );
  await sqlRun(
    "CREATE INDEX IF NOT EXISTS idx_portal_events_action ON portal_events(action, created_at)"
  );
  schemaReady = true;
}

export async function createPortalSession(
  id: string,
  userAgent = "",
  meta?: {
    clientIp?: string | null;
    authRole?: string | null;
    entryPath?: string | null;
    referrer?: string | null;
  }
): Promise<void> {
  await ensureAnalyticsSchema();
  await sqlRun(
    `INSERT INTO portal_sessions (id, user_agent, client_ip, auth_role, entry_path, referrer)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       last_seen_at = datetime('now'),
       ended_at = NULL,
       user_agent = CASE WHEN excluded.user_agent != '' THEN excluded.user_agent ELSE portal_sessions.user_agent END,
       client_ip = COALESCE(portal_sessions.client_ip, excluded.client_ip),
       auth_role = COALESCE(portal_sessions.auth_role, excluded.auth_role),
       entry_path = COALESCE(portal_sessions.entry_path, excluded.entry_path),
       referrer = COALESCE(portal_sessions.referrer, excluded.referrer)`,
    [
      id,
      userAgent.slice(0, 500),
      meta?.clientIp ?? null,
      meta?.authRole ?? null,
      meta?.entryPath ?? null,
      meta?.referrer ?? null,
    ]
  );
  if (meta?.clientIp?.trim()) {
    const { touchPortalDeviceTelemetry } = await import("./portal-devices");
    await touchPortalDeviceTelemetry({
      clientIp: meta.clientIp,
      userAgent,
    });
  }
}

export async function updatePortalSessionGeo(id: string, geo: ClientGeo): Promise<void> {
  if (!geo.source) return;
  await ensureAnalyticsSchema();
  await sqlRun(
    `UPDATE portal_sessions SET
       geo_country = COALESCE(geo_country, ?),
       geo_region = COALESCE(geo_region, ?),
       geo_city = COALESCE(geo_city, ?),
       geo_timezone = COALESCE(geo_timezone, ?),
       geo_latitude = COALESCE(geo_latitude, ?),
       geo_longitude = COALESCE(geo_longitude, ?),
       geo_source = COALESCE(geo_source, ?)
     WHERE id = ?`,
    [
      geo.country,
      geo.region,
      geo.city,
      geo.timezone,
      geo.latitude,
      geo.longitude,
      geo.source,
      id,
    ]
  );
}

/** Overwrite session geo with browser GPS (more precise than IP/Vercel). */
export async function applyBrowserSessionGeo(
  id: string,
  geo: ClientGeo,
  accuracy: number | null = null
): Promise<void> {
  if (geo.source !== "browser") return;
  await ensureAnalyticsSchema();
  await sqlRun(
    `UPDATE portal_sessions SET
       geo_country = ?,
       geo_region = ?,
       geo_city = ?,
       geo_timezone = COALESCE(geo_timezone, ?),
       geo_latitude = ?,
       geo_longitude = ?,
       geo_accuracy = ?,
       geo_source = 'browser'
     WHERE id = ?`,
    [
      geo.country,
      geo.region,
      geo.city,
      geo.timezone,
      geo.latitude,
      geo.longitude,
      accuracy,
      id,
    ]
  );
}

export async function updatePortalSessionMeta(
  id: string,
  meta: {
    clientIp?: string | null;
    authRole?: string | null;
    entryPath?: string | null;
    referrer?: string | null;
  }
): Promise<void> {
  await ensureAnalyticsSchema();
  await sqlRun(
    `UPDATE portal_sessions SET
       client_ip = COALESCE(client_ip, ?),
       auth_role = COALESCE(auth_role, ?),
       entry_path = COALESCE(entry_path, ?),
       referrer = COALESCE(referrer, ?),
       last_seen_at = datetime('now')
     WHERE id = ?`,
    [
      meta.clientIp ?? null,
      meta.authRole ?? null,
      meta.entryPath ?? null,
      meta.referrer ?? null,
      id,
    ]
  );
  if (meta.clientIp?.trim()) {
    const row = await sqlGet<{ user_agent: string }>(
      "SELECT user_agent FROM portal_sessions WHERE id = ?",
      [id]
    );
    const { touchPortalDeviceTelemetry } = await import("./portal-devices");
    await touchPortalDeviceTelemetry({
      clientIp: meta.clientIp,
      userAgent: row?.user_agent,
    });
  }
}

export async function touchPortalSession(id: string): Promise<void> {
  await ensureAnalyticsSchema();
  await sqlRun("UPDATE portal_sessions SET last_seen_at = datetime('now') WHERE id = ?", [id]);
}

export async function endPortalSession(id: string): Promise<void> {
  await ensureAnalyticsSchema();
  await sqlRun(
    "UPDATE portal_sessions SET ended_at = datetime('now'), last_seen_at = datetime('now') WHERE id = ?",
    [id]
  );
}

export async function insertPortalEvent(event: {
  sessionId: string;
  eventType: PortalEventType;
  action: string;
  eventDate?: string | null;
  path?: string | null;
  detail?: Record<string, unknown> | null;
  clientIp?: string | null;
}): Promise<void> {
  await ensureAnalyticsSchema();
  const clientIp = event.clientIp?.trim() || null;
  if (clientIp) {
    await updatePortalSessionMeta(event.sessionId, { clientIp });
  }
  await touchPortalSession(event.sessionId);
  const sessionRow = clientIp
    ? await sqlGet<{ user_agent: string; last_seen_at: string }>(
        "SELECT user_agent, last_seen_at FROM portal_sessions WHERE id = ?",
        [event.sessionId]
      )
    : null;
  if (clientIp && sessionRow) {
    const { touchPortalDeviceTelemetry } = await import("./portal-devices");
    await touchPortalDeviceTelemetry({
      clientIp,
      userAgent: sessionRow.user_agent,
      lastSeenAt: sessionRow.last_seen_at,
    });
  }
  const detail =
    event.detail && Object.keys(event.detail).length > 0
      ? JSON.stringify(event.detail)
      : null;
  await sqlRun(
    `INSERT INTO portal_events (session_id, event_type, action, event_date, path, detail, client_ip)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      event.sessionId,
      event.eventType,
      event.action,
      event.eventDate ?? null,
      event.path ?? null,
      detail,
      clientIp,
    ]
  );
}

export async function getActivitySummary(): Promise<PortalActivitySummary> {
  await ensureAnalyticsSchema();
  const [active, sessionsToday, loginsToday, mutationsToday, pageViewsToday, byAction] =
    await Promise.all([
      sqlGet<{ c: number }>(
        "SELECT COUNT(*) as c FROM portal_sessions WHERE ended_at IS NULL"
      ),
      sqlGet<{ c: number }>(
        "SELECT COUNT(*) as c FROM portal_sessions WHERE date(started_at) = date('now')"
      ),
      sqlGet<{ c: number }>(
        `SELECT COUNT(*) as c FROM portal_events
         WHERE event_type = 'auth' AND action = 'login' AND date(created_at) = date('now')`
      ),
      sqlGet<{ c: number }>(
        `SELECT COUNT(*) as c FROM portal_events
         WHERE event_type IN ('mutation', 'api') AND date(created_at) = date('now')`
      ),
      sqlGet<{ c: number }>(
        `SELECT COUNT(*) as c FROM portal_events
         WHERE event_type = 'page_view' AND date(created_at) = date('now')`
      ),
      sqlAll<{ action: string; count: number }>(
        `SELECT action, COUNT(*) as count FROM portal_events
         WHERE date(created_at) = date('now')
         GROUP BY action ORDER BY count DESC LIMIT 12`
      ),
    ]);

  return {
    activeSessions: active?.c ?? 0,
    sessionsToday: sessionsToday?.c ?? 0,
    loginsToday: loginsToday?.c ?? 0,
    mutationsToday: mutationsToday?.c ?? 0,
    pageViewsToday: pageViewsToday?.c ?? 0,
    byAction,
  };
}

export async function listRecentEvents(limit = 40): Promise<PortalEvent[]> {
  await ensureAnalyticsSchema();
  return sqlAll<PortalEvent>(
    `SELECT id, session_id, event_type, action, event_date, path, detail, created_at
     FROM portal_events ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
}

export async function listPortalSessionsForExport(): Promise<PortalSession[]> {
  await ensureAnalyticsSchema();
  return sqlAll<PortalSession>(
    `SELECT id, started_at, last_seen_at, ended_at, user_agent,
            client_ip, entry_path, auth_role, referrer,
            geo_country, geo_region, geo_city, geo_timezone,
            geo_latitude, geo_longitude, geo_accuracy, geo_source
     FROM portal_sessions ORDER BY started_at DESC`
  );
}

export async function listPortalEventsForExport(): Promise<PortalEvent[]> {
  await ensureAnalyticsSchema();
  return sqlAll<PortalEvent>(
    `SELECT id, session_id, event_type, action, event_date, path, detail, created_at
     FROM portal_events ORDER BY created_at DESC`
  );
}