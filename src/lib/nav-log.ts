import { parseEventDateFromDayPath } from "./captain-ip-mappings";
import { sqlAll, sqlGet } from "./db-client";
import { ensureAnalyticsSchema } from "./portal-analytics";
import { centralDayBoundsUtc, centralRollingWindowStartUtc } from "./portal-time";
import { enrichMissingSessionGeo } from "./session-geo";

const SESSION_GEO_COLUMNS = `s.geo_country, s.geo_region, s.geo_city, s.geo_timezone,
  s.geo_latitude, s.geo_longitude, s.geo_accuracy, s.geo_source`;

export type NavMethod =
  | "entry"
  | "link"
  | "button"
  | "typed_url"
  | "history"
  | "redirect";

export { NAV_METHOD_LABELS } from "./nav-log-constants";

export interface NavLogSummary {
  uniqueVisitorsToday: number;
  uniqueVisitors7d: number;
  sessionsToday: number;
  sessions7d: number;
  pageViewsToday: number;
  pageViews7d: number;
  byMethod: { method: string; count: number }[];
  topPaths: { path: string; count: number }[];
}

export interface NavSessionRow {
  id: string;
  started_at: string;
  last_seen_at: string;
  ended_at: string | null;
  client_ip: string | null;
  entry_path: string | null;
  auth_role: string | null;
  user_agent: string;
  page_views: number;
  nav_events: number;
  geo_country: string | null;
  geo_region: string | null;
  geo_city: string | null;
  geo_timezone: string | null;
  geo_latitude: number | null;
  geo_longitude: number | null;
  geo_accuracy: number | null;
  geo_source: string | null;
}

export interface NavEventRow {
  id: number;
  session_id: string;
  method: string;
  path: string | null;
  event_date: string | null;
  detail: string | null;
  created_at: string;
  client_ip: string | null;
  auth_role: string | null;
  user_agent: string | null;
  geo_country: string | null;
  geo_region: string | null;
  geo_city: string | null;
  geo_timezone: string | null;
  geo_latitude: number | null;
  geo_longitude: number | null;
  geo_accuracy: number | null;
  geo_source: string | null;
}

export async function getNavLogSummary(): Promise<NavLogSummary> {
  await ensureAnalyticsSchema();
  const { startUtc: todayStartUtc, endUtc: todayEndUtc } = centralDayBoundsUtc();
  const window7dStartUtc = centralRollingWindowStartUtc(7);

  const [
    uniqueVisitorsToday,
    uniqueVisitors7d,
    sessionsToday,
    sessions7d,
    pageViewsToday,
    pageViews7d,
    byMethod,
    topPaths,
  ] = await Promise.all([
    sqlGet<{ c: number }>(
      `SELECT COUNT(DISTINCT client_ip) as c FROM portal_sessions
       WHERE client_ip IS NOT NULL AND client_ip != ''
         AND started_at >= ? AND started_at < ?`,
      [todayStartUtc, todayEndUtc]
    ),
    sqlGet<{ c: number }>(
      `SELECT COUNT(DISTINCT client_ip) as c FROM portal_sessions
       WHERE client_ip IS NOT NULL AND client_ip != ''
         AND started_at >= ?`,
      [window7dStartUtc]
    ),
    sqlGet<{ c: number }>(
      `SELECT COUNT(*) as c FROM portal_sessions
       WHERE started_at >= ? AND started_at < ?`,
      [todayStartUtc, todayEndUtc]
    ),
    sqlGet<{ c: number }>(
      "SELECT COUNT(*) as c FROM portal_sessions WHERE started_at >= ?",
      [window7dStartUtc]
    ),
    sqlGet<{ c: number }>(
      `SELECT COUNT(*) as c FROM portal_events
       WHERE event_type IN ('navigation', 'page_view')
         AND created_at >= ? AND created_at < ?`,
      [todayStartUtc, todayEndUtc]
    ),
    sqlGet<{ c: number }>(
      `SELECT COUNT(*) as c FROM portal_events
       WHERE event_type IN ('navigation', 'page_view')
         AND created_at >= ?`,
      [window7dStartUtc]
    ),
    sqlAll<{ method: string; count: number }>(
      `SELECT action as method, COUNT(*) as count FROM portal_events
       WHERE event_type = 'navigation' AND created_at >= ?
       GROUP BY action ORDER BY count DESC`,
      [window7dStartUtc]
    ),
    sqlAll<{ path: string; count: number }>(
      `SELECT path, COUNT(*) as count FROM portal_events
       WHERE event_type IN ('navigation', 'page_view')
         AND path IS NOT NULL AND created_at >= ?
       GROUP BY path ORDER BY count DESC LIMIT 15`,
      [window7dStartUtc]
    ),
  ]);

  return {
    uniqueVisitorsToday: uniqueVisitorsToday?.c ?? 0,
    uniqueVisitors7d: uniqueVisitors7d?.c ?? 0,
    sessionsToday: sessionsToday?.c ?? 0,
    sessions7d: sessions7d?.c ?? 0,
    pageViewsToday: pageViewsToday?.c ?? 0,
    pageViews7d: pageViews7d?.c ?? 0,
    byMethod,
    topPaths,
  };
}

export async function listNavSessions(limit = 80): Promise<NavSessionRow[]> {
  await ensureAnalyticsSchema();
  const rows = await sqlAll<NavSessionRow>(
    `SELECT s.id, s.started_at, s.last_seen_at, s.ended_at, s.client_ip, s.entry_path,
            s.auth_role, s.user_agent, ${SESSION_GEO_COLUMNS},
            (SELECT COUNT(*) FROM portal_events e
             WHERE e.session_id = s.id AND e.event_type IN ('navigation', 'page_view')) as page_views,
            (SELECT COUNT(*) FROM portal_events e
             WHERE e.session_id = s.id AND e.event_type = 'navigation') as nav_events
     FROM portal_sessions s
     ORDER BY s.started_at DESC
     LIMIT ?`,
    [limit]
  );
  return enrichMissingSessionGeo<NavSessionRow>(rows);
}

export async function listNavEvents(limit = 200): Promise<NavEventRow[]> {
  await ensureAnalyticsSchema();
  return sqlAll<NavEventRow>(
    `SELECT e.id, e.session_id, e.action as method, e.path, e.event_date, e.detail, e.created_at,
            COALESCE(NULLIF(TRIM(e.client_ip), ''), s.client_ip) as client_ip,
            s.auth_role, s.user_agent, ${SESSION_GEO_COLUMNS}
     FROM portal_events e
     LEFT JOIN portal_sessions s ON s.id = e.session_id
     WHERE e.event_type IN ('navigation', 'page_view')
     ORDER BY e.created_at DESC
     LIMIT ?`,
    [limit]
  );
}

export async function listNavEventsForSessions(sessionIds: string[]): Promise<NavEventRow[]> {
  await ensureAnalyticsSchema();
  if (!sessionIds.length) return [];
  const placeholders = sessionIds.map(() => "?").join(", ");
  return sqlAll<NavEventRow>(
    `SELECT e.id, e.session_id, e.action as method, e.path, e.event_date, e.detail, e.created_at,
            COALESCE(NULLIF(TRIM(e.client_ip), ''), s.client_ip) as client_ip,
            s.auth_role, s.user_agent, ${SESSION_GEO_COLUMNS}
     FROM portal_events e
     LEFT JOIN portal_sessions s ON s.id = e.session_id
     WHERE e.session_id IN (${placeholders})
       AND e.event_type IN ('navigation', 'page_view')
     ORDER BY e.session_id, e.created_at DESC`,
    sessionIds
  );
}

export function groupNavEventsBySession(events: NavEventRow[]): Map<string, NavEventRow[]> {
  const grouped = new Map<string, NavEventRow[]>();
  for (const event of events) {
    const list = grouped.get(event.session_id) ?? [];
    list.push(event);
    grouped.set(event.session_id, list);
  }
  return grouped;
}

/** Prefer the most recent day-page event date from session navigation events. */
export function eventDateFromNavSession(
  session: Pick<NavSessionRow, "entry_path">,
  events: Pick<NavEventRow, "path" | "event_date">[]
): string | null {
  for (const event of events) {
    if (event.event_date) return event.event_date;
    const fromPath = event.path ? parseEventDateFromDayPath(event.path) : null;
    if (fromPath) return fromPath;
  }
  if (session.entry_path) {
    return parseEventDateFromDayPath(session.entry_path);
  }
  return null;
}

export async function listSessionClientIps(
  sessionIds: string[]
): Promise<Map<string, string | null>> {
  await ensureAnalyticsSchema();
  const result = new Map<string, string | null>();
  if (!sessionIds.length) return result;

  const placeholders = sessionIds.map(() => "?").join(", ");
  const rows = await sqlAll<{ id: string; client_ip: string | null }>(
    `SELECT id, client_ip FROM portal_sessions WHERE id IN (${placeholders})`,
    sessionIds
  );
  for (const row of rows) {
    result.set(row.id, row.client_ip);
  }
  return result;
}