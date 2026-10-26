import { formatAuditEntityType } from "./audit-display";
import type { AuthRole } from "./auth-types";
import { ROLE_LABELS } from "./auth-types";
import type { AuditLogEntry } from "./audit-log";
import { ensureAuditSchema } from "./audit-log";
import {
  buildCaptainIpLookup,
  listDayCaptainOptions,
  listEnrichedCaptainIpMappings,
  parseEventDateFromDayPath,
  resolveCaptainNameForPortalSession,
  type CaptainIpLookup,
} from "./captain-ip-mappings";
import { formatGeoLabel } from "./client-geo";
import { sqlAll, sqlGet, sqlRun } from "./db-client";
import { formatEventDate, getEventDates, isEventDate } from "./event-dates";
import {
  eventDateFromNavSession,
  type NavEventRow,
  type NavSessionRow,
} from "./nav-log";
import { ensureAnalyticsSchema } from "./portal-analytics";
import {
  centralDateFromSqliteUtc,
  centralDateString,
  centralDayBoundsUtc,
  centralRollingWindowStartUtc,
  PORTAL_TIME_ZONE,
} from "./portal-time";
import { formatPortalPath } from "./portal-path-labels";
import { enrichMissingSessionGeo } from "./session-geo";

export type PortalActivityRange = "today" | "7d" | "event_day" | "all";

export type PortalActivityKind = "all" | "pages" | "changes";
export type PortalActivityRole = AuthRole | "all" | "visitor";
export type PortalActivityView = "grouped" | "sessions";
export type PortalActivityMode = "history" | "traffic";

export interface PortalActivityQuery {
  range: PortalActivityRange;
  eventDate: string | null;
  role: PortalActivityRole;
  captain: string | null;
  kind: PortalActivityKind;
  sessionId: string | null;
  view: PortalActivityView;
  mode: PortalActivityMode;
}

export interface PortalHistoryDay {
  day: string;
  label: string;
  entries: PortalTimelineEntry[];
}

export interface PortalActorGroup {
  key: string;
  label: string;
  subtitle: string;
  sessions: PortalActivitySessionView[];
  session_count: number;
  page_count: number;
  change_count: number;
  first_started_at: string;
  last_seen_at: string;
}

export interface PortalSessionDayGroup {
  day: string;
  label: string;
  sessions: PortalActivitySessionView[];
  session_count: number;
  page_count: number;
  change_count: number;
  first_started_at: string;
  last_seen_at: string;
}

export interface PortalPageTimelineEntry {
  kind: "page";
  id: number;
  created_at: string;
  path: string | null;
  method: string;
  detail: string | null;
}

export interface PortalChangeTimelineEntry {
  kind: "change";
  id: number;
  created_at: string;
  operation: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  changes: string;
  event_date: string | null;
}

export type PortalTimelineEntry = PortalPageTimelineEntry | PortalChangeTimelineEntry;

export type PortalTimelineEntryWithWho = PortalTimelineEntry & { who?: string };

export interface PortalActivitySessionView {
  session: NavSessionRow;
  captain_name: string | null;
  location_label: string;
  /** Full timeline — empty on list load; filled when a session is expanded. */
  timeline: PortalTimelineEntry[];
  /** Collapsed-row activity trail from a lightweight sample (no full event payloads). */
  summary_stops?: PortalActivitySummaryStop[];
  page_count: number;
  change_count: number;
}

export type PortalActivityListResult = {
  sessions: PortalActivitySessionView[];
  truncated: boolean;
  limit: number;
};

/** Cap list queries so portal-log stays responsive. */
export const PORTAL_LOG_SESSION_LIMIT = 150;

/** Max candidate sessions before kind/captain filters (keeps count queries bounded). */
const PORTAL_LOG_CANDIDATE_CAP = 400;

/** Merge session timelines for a day (or any set of sessions), chronological. */
export function mergePortalTimelines(
  sessions: PortalActivitySessionView[],
  options?: { includeWho?: boolean }
): PortalTimelineEntryWithWho[] {
  const entries: PortalTimelineEntryWithWho[] = [];
  for (const view of sessions) {
    const who = options?.includeWho ? portalSessionWhoPrimary(view) : undefined;
    for (const item of view.timeline) {
      entries.push(who ? { ...item, who } : { ...item });
    }
  }
  return entries.sort((a, b) => {
    const byTime = a.created_at.localeCompare(b.created_at);
    if (byTime !== 0) return byTime;
    if (a.kind !== b.kind) return a.kind === "page" ? -1 : 1;
    return a.id - b.id;
  });
}

const SESSION_GEO_COLUMNS = `s.geo_country, s.geo_region, s.geo_city, s.geo_timezone,
  s.geo_latitude, s.geo_longitude, s.geo_accuracy, s.geo_source`;

export function parsePortalActivityQuery(
  params: Record<string, string | string[] | undefined>
): PortalActivityQuery {
  const pick = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };

  const modePeek = pick("mode");
  const modeDefault: PortalActivityMode = modePeek === "traffic" ? "traffic" : "history";
  const rangeRaw = pick("range");
  const range: PortalActivityRange =
    rangeRaw === "today" || rangeRaw === "event_day" || rangeRaw === "all"
      ? rangeRaw
      : modeDefault === "history"
        ? "all"
        : "7d";

  const kindRaw = pick("kind");
  const kind: PortalActivityKind =
    kindRaw === "pages" || kindRaw === "changes" ? kindRaw : "all";

  const roleRaw = pick("role");
  const role: PortalActivityRole =
    roleRaw === "captain" ||
    roleRaw === "admin" ||
    roleRaw === "viewer" ||
    roleRaw === "visitor"
      ? roleRaw
      : "all";

  const viewRaw = pick("view");
  const view: PortalActivityView = viewRaw === "sessions" ? "sessions" : "grouped";
  const modeRaw = pick("mode");
  const mode: PortalActivityMode = modeRaw === "traffic" ? "traffic" : "history";

  let eventDate = pick("event_date")?.trim() || null;
  if (range === "event_day" && !eventDate) {
    const today = centralDateString();
    const eventDates = getEventDates();
    eventDate = eventDates.includes(today) ? today : (eventDates[0] ?? null);
  }

  return {
    range,
    eventDate,
    role,
    captain: pick("captain")?.trim() || null,
    kind,
    sessionId: pick("session")?.trim() || null,
    view,
    mode,
  };
}

export function sessionMatchesRole(
  session: Pick<NavSessionRow, "auth_role">,
  role: PortalActivityRole
): boolean {
  if (role === "all") return true;
  const authRole = session.auth_role?.trim() ?? "";
  if (role === "visitor") return authRole === "";
  return authRole === role;
}

export function portalActorGroupKey(view: PortalActivitySessionView): string {
  const captain = view.captain_name?.trim();
  if (captain) return `name:${captain.toLowerCase()}`;
  const role = view.session.auth_role?.trim();
  if (role) return `role:${role}:ip:${view.session.client_ip ?? ""}`;
  return `visitor:ip:${view.session.client_ip ?? "unknown"}`;
}

/** IP and geo label for portal-log rows (empty when unknown). */
export function formatPortalSessionWhere(view: PortalActivitySessionView): string {
  const parts: string[] = [];
  const ip = view.session.client_ip?.trim();
  if (ip) parts.push(ip);
  const loc = view.location_label?.trim();
  if (loc && loc !== "—") parts.push(loc);
  return parts.join(" · ");
}

export function portalSessionWhoPrimary(view: PortalActivitySessionView): string {
  const captain = view.captain_name?.trim();
  if (captain) return captain;
  const role = view.session.auth_role as AuthRole | null;
  return role ? (ROLE_LABELS[role] ?? role) : "Visitor";
}

export function portalSessionWhoSecondary(view: PortalActivitySessionView): string {
  const captain = view.captain_name?.trim();
  const role = view.session.auth_role as AuthRole | null;
  if (captain && role) return ROLE_LABELS[role] ?? role;
  return "";
}

export function portalActorGroupLabel(view: PortalActivitySessionView): {
  label: string;
  subtitle: string;
} {
  return {
    label: portalSessionWhoPrimary(view),
    subtitle: portalSessionWhoSecondary(view),
  };
}

export function groupPortalActivityByActor(
  sessions: PortalActivitySessionView[]
): PortalActorGroup[] {
  const grouped = new Map<string, PortalActivitySessionView[]>();
  for (const view of sessions) {
    const key = portalActorGroupKey(view);
    const list = grouped.get(key) ?? [];
    list.push(view);
    grouped.set(key, list);
  }

  const groups: PortalActorGroup[] = [];
  for (const [key, memberSessions] of grouped.entries()) {
    const sorted = [...memberSessions].sort((a, b) =>
      b.session.started_at.localeCompare(a.session.started_at)
    );
    const first = sorted[sorted.length - 1]!;
    const latest = sorted[0]!;
    const { label, subtitle } = portalActorGroupLabel(latest);
    groups.push({
      key,
      label,
      subtitle,
      sessions: sorted,
      session_count: sorted.length,
      page_count: sorted.reduce((sum, row) => sum + row.page_count, 0),
      change_count: sorted.reduce((sum, row) => sum + row.change_count, 0),
      first_started_at: first.session.started_at,
      last_seen_at: latest.session.last_seen_at,
    });
  }

  return groups.sort((a, b) => b.last_seen_at.localeCompare(a.last_seen_at));
}

/** Newest last_seen first — When column in Traffic matches row order. */
export function sortByLastSeenDesc<T extends { last_seen_at: string; id: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => b.last_seen_at.localeCompare(a.last_seen_at) || a.id.localeCompare(b.id)
  );
}

/** One-level history: newest day first, newest events first within the day. */
export function groupTimelineEntriesByDay(entries: PortalTimelineEntry[]): PortalHistoryDay[] {
  const grouped = new Map<string, PortalTimelineEntry[]>();
  for (const entry of entries) {
    const day = centralDateFromSqliteUtc(entry.created_at);
    const list = grouped.get(day) ?? [];
    list.push(entry);
    grouped.set(day, list);
  }

  return [...grouped.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, items]) => ({
      day,
      label: portalSessionDayLabel(day),
      entries: [...items].sort(
        (a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id
      ),
    }));
}

/** Calendar day label for nested portal-log day rollups (Central Time). */
export function portalSessionDayLabel(day: string): string {
  if (isEventDate(day)) return formatEventDate(day);
  const [year, month, date] = day.split("-").map(Number);
  const noon = new Date(Date.UTC(year, month - 1, date, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PORTAL_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(noon);
}

export function groupPortalSessionsByDay(
  sessions: PortalActivitySessionView[]
): PortalSessionDayGroup[] {
  const grouped = new Map<string, PortalActivitySessionView[]>();
  for (const view of sessions) {
    const day = centralDateFromSqliteUtc(view.session.started_at);
    const list = grouped.get(day) ?? [];
    list.push(view);
    grouped.set(day, list);
  }

  const groups: PortalSessionDayGroup[] = [];
  for (const [day, memberSessions] of grouped.entries()) {
    const sorted = [...memberSessions].sort((a, b) =>
      b.session.started_at.localeCompare(a.session.started_at)
    );
    const first = sorted[sorted.length - 1]!;
    const latest = sorted[0]!;
    groups.push({
      day,
      label: portalSessionDayLabel(day),
      sessions: sorted,
      session_count: sorted.length,
      page_count: sorted.reduce((sum, row) => sum + row.page_count, 0),
      change_count: sorted.reduce((sum, row) => sum + row.change_count, 0),
      first_started_at: first.session.started_at,
      last_seen_at: latest.session.last_seen_at,
    });
  }

  return groups.sort((a, b) => b.last_seen_at.localeCompare(a.last_seen_at));
}

/** One-line label for a page view or audit change in session summaries. */
export function formatTimelineActivityStop(entry: PortalTimelineEntry): string {
  if (entry.kind === "page") {
    return formatPortalPath(entry.path);
  }
  const entity = formatAuditEntityType(entry.entity_type);
  const summary = entry.summary?.trim();
  if (summary) return `${entity} · ${summary}`;
  return `${entry.operation} ${entity}`;
}

export interface PortalActivitySummaryStop {
  kind: PortalTimelineEntry["kind"];
  label: string;
}

/** Collapsed row summary — interleaves navigation and data changes chronologically. */
export function buildSessionActivitySummary(
  timeline: PortalTimelineEntry[],
  maxStops = 5
): { stops: PortalActivitySummaryStop[]; truncated: boolean } {
  const stops: PortalActivitySummaryStop[] = [];
  for (const item of timeline) {
    const label = formatTimelineActivityStop(item);
    if (label === "—") continue;
    const last = stops[stops.length - 1];
    if (last?.label === label && last.kind === item.kind) continue;
    stops.push({ kind: item.kind, label });
  }

  if (stops.length <= maxStops) {
    return { stops, truncated: false };
  }

  const head = stops.slice(0, maxStops - 1);
  const tail = stops[stops.length - 1]!;
  return {
    stops: [...head, { kind: tail.kind, label: `… → ${tail.label}` }],
    truncated: true,
  };
}

function truncateActivityStops(
  stops: PortalActivitySummaryStop[],
  maxStops: number
): PortalActivitySummaryStop[] {
  if (stops.length <= maxStops) return stops;
  const head = stops.slice(0, maxStops - 1);
  const tail = stops[stops.length - 1]!;
  return [...head, { kind: tail.kind, label: `… → ${tail.label}` }];
}

/** Prefer full timeline labels; fall back to list-load summary stops. */
export function sessionActivityStops(
  view: PortalActivitySessionView,
  maxStops = 5
): PortalActivitySummaryStop[] {
  if (view.timeline.length > 0) {
    return buildSessionActivitySummary(view.timeline, maxStops).stops;
  }
  return truncateActivityStops(view.summary_stops ?? [], maxStops);
}

/** Level-2 day rollup — nav and activity on separate lines (chronological within each). */
export function buildDayActivitySummary(
  sessions: PortalActivitySessionView[],
  maxStopsPerKind = 4
): { nav: PortalActivitySummaryStop[]; activity: PortalActivitySummaryStop[] } {
  const nav: PortalActivitySummaryStop[] = [];
  const activity: PortalActivitySummaryStop[] = [];

  const withTimeline = sessions.some((view) => view.timeline.length > 0);
  if (withTimeline) {
    const entries = sessions
      .flatMap((view) => view.timeline)
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);

    for (const item of entries) {
      const label = formatTimelineActivityStop(item);
      if (label === "—") continue;
      const list = item.kind === "page" ? nav : activity;
      if (list[list.length - 1]?.label === label) continue;
      list.push({ kind: item.kind, label });
    }
  } else {
    for (const view of sessions) {
      for (const stop of view.summary_stops ?? []) {
        if (stop.label === "—") continue;
        const list = stop.kind === "page" ? nav : activity;
        if (list[list.length - 1]?.label === stop.label) continue;
        list.push(stop);
      }
    }
  }

  return {
    nav: truncateActivityStops(nav, maxStopsPerKind),
    activity: truncateActivityStops(activity, maxStopsPerKind),
  };
}

export function eventMatchesEventDate(
  event: Pick<NavEventRow, "path" | "event_date">,
  eventDate: string
): boolean {
  if (event.event_date === eventDate) return true;
  if (!event.path) return false;
  return parseEventDateFromDayPath(event.path) === eventDate;
}

export function buildSessionTimeline(
  events: NavEventRow[],
  audits: AuditLogEntry[],
  options: { kind: PortalActivityKind; eventDate?: string | null; sinceUtc?: string | null }
): PortalTimelineEntry[] {
  const { kind, eventDate, sinceUtc } = options;
  const items: PortalTimelineEntry[] = [];

  if (kind !== "changes") {
    for (const event of events) {
      if (sinceUtc && event.created_at < sinceUtc) continue;
      if (eventDate && !eventMatchesEventDate(event, eventDate)) continue;
      items.push({
        kind: "page",
        id: event.id,
        created_at: event.created_at,
        path: event.path,
        method: event.method,
        detail: event.detail,
      });
    }
  }

  if (kind !== "pages") {
    for (const audit of audits) {
      if (sinceUtc && audit.created_at < sinceUtc) continue;
      if (eventDate && audit.event_date !== eventDate) continue;
      items.push({
        kind: "change",
        id: audit.id,
        created_at: audit.created_at,
        operation: audit.operation,
        entity_type: audit.entity_type,
        entity_id: audit.entity_id,
        summary: audit.summary,
        changes: audit.changes,
        event_date: audit.event_date,
      });
    }
  }

  return items.sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id
  );
}

function resolveSinceUtc(query: PortalActivityQuery): string | null {
  if (query.range === "today") {
    return centralDayBoundsUtc().startUtc;
  }
  if (query.range === "7d") {
    return centralRollingWindowStartUtc(7);
  }
  return null;
}

async function listSessionIdsForEventDay(eventDate: string): Promise<string[]> {
  await ensureAnalyticsSchema();
  await ensureAuditSchema();
  const pathLike = `/day/${eventDate}%`;
  const rows = await sqlAll<{ session_id: string }>(
    `SELECT DISTINCT session_id FROM (
       SELECT e.session_id as session_id
       FROM portal_events e
       WHERE e.session_id IS NOT NULL
         AND e.event_type IN ('navigation', 'page_view')
         AND (e.event_date = ? OR e.path LIKE ?)
       UNION
       SELECT a.session_id as session_id
       FROM audit_log a
       WHERE a.session_id IS NOT NULL AND a.event_date = ?
     )
     WHERE session_id IS NOT NULL AND session_id != ''`,
    [eventDate, pathLike, eventDate]
  );
  return rows.map((row) => row.session_id);
}

async function listSessionsByIds(
  sessionIds: string[],
  options?: { enrichGeo?: boolean }
): Promise<NavSessionRow[]> {
  await ensureAnalyticsSchema();
  if (!sessionIds.length) return [];
  const placeholders = sessionIds.map(() => "?").join(", ");
  const rows = await sqlAll<NavSessionRow>(
    `${SESSION_SELECT}
     WHERE s.id IN (${placeholders})
     ORDER BY s.last_seen_at DESC`,
    sessionIds
  );
  return options?.enrichGeo ? enrichMissingSessionGeo(rows) : rows;
}

function sessionRoleSql(role: PortalActivityRole): { clause: string; params: string[] } {
  if (role === "all") return { clause: "", params: [] };
  if (role === "visitor") {
    return { clause: "AND (s.auth_role IS NULL OR s.auth_role = '')", params: [] };
  }
  return { clause: "AND s.auth_role = ?", params: [role] };
}

const SESSION_SELECT = `SELECT s.id, s.started_at, s.last_seen_at, s.ended_at, s.client_ip, s.entry_path,
            s.auth_role, s.user_agent, ${SESSION_GEO_COLUMNS},
            0 as page_views,
            0 as nav_events
     FROM portal_sessions s`;

async function listSessionsInWindow(
  sinceUtc: string,
  role: PortalActivityRole,
  options?: { enrichGeo?: boolean }
): Promise<NavSessionRow[]> {
  await ensureAnalyticsSchema();
  const { clause: roleClause, params: roleParams } = sessionRoleSql(role);
  const params: (string | number)[] = [sinceUtc, ...roleParams];

  const rows = await sqlAll<NavSessionRow>(
    `${SESSION_SELECT}
     WHERE s.last_seen_at >= ?
       ${roleClause}
     ORDER BY s.last_seen_at DESC`,
    params
  );
  return options?.enrichGeo ? enrichMissingSessionGeo(rows) : rows;
}

async function listSessionsAllTime(
  role: PortalActivityRole,
  options?: { enrichGeo?: boolean }
): Promise<NavSessionRow[]> {
  await ensureAnalyticsSchema();
  const { clause: roleClause, params: roleParams } = sessionRoleSql(role);

  const rows = await sqlAll<NavSessionRow>(
    `${SESSION_SELECT}
     WHERE 1=1
       ${roleClause}
     ORDER BY s.last_seen_at DESC`,
    roleParams
  );
  return options?.enrichGeo ? enrichMissingSessionGeo(rows) : rows;
}

let auditSessionBackfillDone = false;
let sessionAuthRoleBackfillDone = false;

/** Stamp auth_role from audit_log when the session row was created without a role. */
export async function backfillSessionAuthRoleFromAudit(): Promise<number> {
  if (sessionAuthRoleBackfillDone) return 0;
  await ensureAnalyticsSchema();
  await ensureAuditSchema();

  const rows = await sqlAll<{ id: string }>(
    `SELECT s.id
     FROM portal_sessions s
     WHERE TRIM(COALESCE(s.auth_role, '')) = ''
       AND EXISTS (
         SELECT 1 FROM audit_log a
         WHERE a.session_id = s.id
           AND TRIM(COALESCE(a.actor_role, '')) != ''
       )`
  );
  sessionAuthRoleBackfillDone = true;
  if (!rows.length) return 0;

  await sqlRun(
    `UPDATE portal_sessions
     SET auth_role = (
       SELECT a.actor_role FROM audit_log a
       WHERE a.session_id = portal_sessions.id
         AND TRIM(COALESCE(a.actor_role, '')) != ''
         AND a.created_at = (
           SELECT MAX(a2.created_at) FROM audit_log a2
           WHERE a2.session_id = portal_sessions.id
             AND TRIM(COALESCE(a2.actor_role, '')) != ''
         )
       LIMIT 1
     )
     WHERE TRIM(COALESCE(auth_role, '')) = ''
       AND EXISTS (
         SELECT 1 FROM audit_log a
         WHERE a.session_id = portal_sessions.id
           AND TRIM(COALESCE(a.actor_role, '')) != ''
       )`
  );
  return rows.length;
}

/** Create stub portal_sessions for audit rows that predate session tracking. */
export async function backfillPortalSessionsFromAudit(): Promise<number> {
  if (auditSessionBackfillDone) return 0;
  await ensureAnalyticsSchema();
  await ensureAuditSchema();

  const orphans = await sqlAll<{ session_id: string }>(
    `SELECT DISTINCT a.session_id
     FROM audit_log a
     WHERE a.session_id IS NOT NULL AND a.session_id != ''
       AND NOT EXISTS (SELECT 1 FROM portal_sessions s WHERE s.id = a.session_id)`
  );
  auditSessionBackfillDone = true;
  if (!orphans.length) return 0;

  for (const { session_id } of orphans) {
    const bounds = await sqlGet<{
      started_at: string;
      last_seen_at: string;
      auth_role: string;
    }>(
      `SELECT MIN(created_at) as started_at,
              MAX(created_at) as last_seen_at,
              (SELECT actor_role FROM audit_log
               WHERE session_id = ?
               ORDER BY created_at DESC LIMIT 1) as auth_role
       FROM audit_log
       WHERE session_id = ?`,
      [session_id, session_id]
    );
    if (!bounds) continue;

    await sqlRun(
      `INSERT INTO portal_sessions (id, started_at, last_seen_at, auth_role, user_agent)
       VALUES (?, ?, ?, ?, '')`,
      [session_id, bounds.started_at, bounds.last_seen_at, bounds.auth_role]
    );
  }

  return orphans.length;
}

async function listNavEventsForSessionsSince(
  sessionIds: string[],
  sinceUtc: string | null
): Promise<NavEventRow[]> {
  await ensureAnalyticsSchema();
  if (!sessionIds.length) return [];
  const placeholders = sessionIds.map(() => "?").join(", ");
  const sinceClause = sinceUtc ? "AND e.created_at >= ?" : "";
  const params: (string | number)[] = [...sessionIds];
  if (sinceUtc) params.push(sinceUtc);

  return sqlAll<NavEventRow>(
    `SELECT e.id, e.session_id, e.action as method, e.path, e.event_date, e.detail, e.created_at,
            COALESCE(NULLIF(TRIM(e.client_ip), ''), s.client_ip) as client_ip,
            s.auth_role, s.user_agent, ${SESSION_GEO_COLUMNS}
     FROM portal_events e
     LEFT JOIN portal_sessions s ON s.id = e.session_id
     WHERE e.session_id IN (${placeholders})
       AND e.event_type IN ('navigation', 'page_view')
       ${sinceClause}
     ORDER BY e.session_id, e.created_at ASC`,
    params
  );
}

async function listAuditForSessionsSince(
  sessionIds: string[],
  sinceUtc: string | null
): Promise<AuditLogEntry[]> {
  await ensureAuditSchema();
  if (!sessionIds.length) return [];
  const placeholders = sessionIds.map(() => "?").join(", ");
  const sinceClause = sinceUtc ? "AND created_at >= ?" : "";
  const params: (string | number)[] = [...sessionIds];
  if (sinceUtc) params.push(sinceUtc);

  return sqlAll<AuditLogEntry>(
    `SELECT id, actor_role, session_id, entity_type, entity_id, operation,
            summary, changes, event_date, created_at
     FROM audit_log
     WHERE session_id IN (${placeholders})
       ${sinceClause}
     ORDER BY session_id, created_at ASC`,
    params
  );
}

function captainMatchesFilter(name: string | null, captainFilter: string | null): boolean {
  if (!captainFilter) return true;
  if (!name) return false;
  return name.toLowerCase().includes(captainFilter.toLowerCase());
}

/** Session row IP, else most recent nav event IP (audit backfill rows often lack session IP). */
export function resolveSessionClientIp(
  session: Pick<NavSessionRow, "client_ip">,
  events: readonly Pick<NavEventRow, "client_ip" | "created_at">[]
): string | null {
  const fromSession = session.client_ip?.trim();
  if (fromSession) return fromSession;

  const sorted = [...events].sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const event of sorted) {
    const ip = event.client_ip?.trim();
    if (ip) return ip;
  }
  return null;
}

function enrichSessions(
  sessions: NavSessionRow[],
  eventsBySession: Map<string, NavEventRow[]>,
  lookup: CaptainIpLookup,
  mappings: Awaited<ReturnType<typeof listEnrichedCaptainIpMappings>>,
  devices: import("./portal-devices").PortalDevice[]
): Array<NavSessionRow & { captain_name: string | null; location_label: string }> {
  return sessions.map((session) => {
    const sessionEvents = eventsBySession.get(session.id) ?? [];
    const eventDate = eventDateFromNavSession(session, sessionEvents);
    const client_ip = resolveSessionClientIp(session, sessionEvents);
    return {
      ...session,
      client_ip,
      captain_name: resolveCaptainNameForPortalSession(
        devices,
        mappings,
        lookup,
        client_ip,
        eventDate,
        session.auth_role
      ),
      location_label: formatGeoLabel(session),
    };
  });
}

/** Captain/geo labels without loading nav events (list path). */
function enrichSessionsLight(
  sessions: NavSessionRow[],
  lookup: CaptainIpLookup,
  mappings: Awaited<ReturnType<typeof listEnrichedCaptainIpMappings>>,
  devices: import("./portal-devices").PortalDevice[]
): Array<NavSessionRow & { captain_name: string | null; location_label: string }> {
  return sessions.map((session) => {
    let client_ip = session.client_ip?.trim() || null;
    if (process.env.NODE_ENV === "development" && !client_ip) {
      client_ip = "127.0.0.1";
    }
    const eventDate = session.entry_path
      ? parseEventDateFromDayPath(session.entry_path)
      : null;
    return {
      ...session,
      client_ip,
      captain_name: resolveCaptainNameForPortalSession(
        devices,
        mappings,
        lookup,
        client_ip,
        eventDate,
        session.auth_role
      ),
      location_label: formatGeoLabel(session),
    };
  });
}

type SessionCountRow = { session_id: string; cnt: number };

async function countPagesBySession(
  sessionIds: string[],
  sinceUtc: string | null,
  eventDate: string | null
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!sessionIds.length) return result;
  await ensureAnalyticsSchema();
  const placeholders = sessionIds.map(() => "?").join(", ");
  const params: (string | number)[] = [...sessionIds];
  let sinceClause = "";
  let eventClause = "";
  if (sinceUtc) {
    sinceClause = "AND e.created_at >= ?";
    params.push(sinceUtc);
  }
  if (eventDate) {
    eventClause = "AND (e.event_date = ? OR e.path LIKE ?)";
    params.push(eventDate, `/day/${eventDate}%`);
  }
  const rows = await sqlAll<SessionCountRow>(
    `SELECT e.session_id as session_id, COUNT(*) as cnt
     FROM portal_events e
     WHERE e.session_id IN (${placeholders})
       AND e.event_type IN ('navigation', 'page_view')
       ${sinceClause}
       ${eventClause}
     GROUP BY e.session_id`,
    params
  );
  for (const row of rows) result.set(row.session_id, Number(row.cnt) || 0);
  return result;
}

async function countChangesBySession(
  sessionIds: string[],
  sinceUtc: string | null,
  eventDate: string | null
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!sessionIds.length) return result;
  await ensureAuditSchema();
  const placeholders = sessionIds.map(() => "?").join(", ");
  const params: (string | number)[] = [...sessionIds];
  let sinceClause = "";
  let eventClause = "";
  if (sinceUtc) {
    sinceClause = "AND created_at >= ?";
    params.push(sinceUtc);
  }
  if (eventDate) {
    eventClause = "AND event_date = ?";
    params.push(eventDate);
  }
  const rows = await sqlAll<SessionCountRow>(
    `SELECT session_id as session_id, COUNT(*) as cnt
     FROM audit_log
     WHERE session_id IN (${placeholders})
       ${sinceClause}
       ${eventClause}
     GROUP BY session_id`,
    params
  );
  for (const row of rows) result.set(row.session_id, Number(row.cnt) || 0);
  return result;
}

const SUMMARY_SAMPLE_PER_SESSION = 8;

type SummaryPageSample = {
  session_id: string;
  id: number;
  created_at: string;
  path: string | null;
};

type SummaryChangeSample = {
  session_id: string;
  id: number;
  created_at: string;
  operation: string;
  entity_type: string;
  summary: string;
};

async function listSummaryPageSamples(
  sessionIds: string[],
  sinceUtc: string | null,
  eventDate: string | null
): Promise<SummaryPageSample[]> {
  if (!sessionIds.length) return [];
  await ensureAnalyticsSchema();
  const placeholders = sessionIds.map(() => "?").join(", ");
  const params: (string | number)[] = [...sessionIds];
  let sinceClause = "";
  let eventClause = "";
  if (sinceUtc) {
    sinceClause = "AND e.created_at >= ?";
    params.push(sinceUtc);
  }
  if (eventDate) {
    eventClause = "AND (e.event_date = ? OR e.path LIKE ?)";
    params.push(eventDate, `/day/${eventDate}%`);
  }
  params.push(SUMMARY_SAMPLE_PER_SESSION);
  return sqlAll<SummaryPageSample>(
    `SELECT session_id, id, created_at, path FROM (
       SELECT e.session_id as session_id, e.id as id, e.created_at as created_at, e.path as path,
              ROW_NUMBER() OVER (
                PARTITION BY e.session_id ORDER BY e.created_at ASC, e.id ASC
              ) AS rn
       FROM portal_events e
       WHERE e.session_id IN (${placeholders})
         AND e.event_type IN ('navigation', 'page_view')
         ${sinceClause}
         ${eventClause}
     ) ranked
     WHERE rn <= ?`,
    params
  );
}

async function listSummaryChangeSamples(
  sessionIds: string[],
  sinceUtc: string | null,
  eventDate: string | null
): Promise<SummaryChangeSample[]> {
  if (!sessionIds.length) return [];
  await ensureAuditSchema();
  const placeholders = sessionIds.map(() => "?").join(", ");
  const params: (string | number)[] = [...sessionIds];
  let sinceClause = "";
  let eventClause = "";
  if (sinceUtc) {
    sinceClause = "AND created_at >= ?";
    params.push(sinceUtc);
  }
  if (eventDate) {
    eventClause = "AND event_date = ?";
    params.push(eventDate);
  }
  params.push(SUMMARY_SAMPLE_PER_SESSION);
  return sqlAll<SummaryChangeSample>(
    `SELECT session_id, id, created_at, operation, entity_type, summary FROM (
       SELECT session_id, id, created_at, operation, entity_type, summary,
              ROW_NUMBER() OVER (
                PARTITION BY session_id ORDER BY created_at ASC, id ASC
              ) AS rn
       FROM audit_log
       WHERE session_id IN (${placeholders})
         ${sinceClause}
         ${eventClause}
     ) ranked
     WHERE rn <= ?`,
    params
  );
}

function buildSummaryStopsFromSamples(
  pages: SummaryPageSample[],
  changes: SummaryChangeSample[],
  kind: PortalActivityKind
): Map<string, PortalActivitySummaryStop[]> {
  const bySession = new Map<string, PortalTimelineEntry[]>();

  if (kind !== "changes") {
    for (const page of pages) {
      const list = bySession.get(page.session_id) ?? [];
      list.push({
        kind: "page",
        id: page.id,
        created_at: page.created_at,
        path: page.path,
        method: "link",
        detail: null,
      });
      bySession.set(page.session_id, list);
    }
  }

  if (kind !== "pages") {
    for (const change of changes) {
      const list = bySession.get(change.session_id) ?? [];
      list.push({
        kind: "change",
        id: change.id,
        created_at: change.created_at,
        operation: change.operation,
        entity_type: change.entity_type,
        entity_id: "",
        summary: change.summary,
        changes: "{}",
        event_date: null,
      });
      bySession.set(change.session_id, list);
    }
  }

  const stopsBySession = new Map<string, PortalActivitySummaryStop[]>();
  for (const [sessionId, items] of bySession) {
    const timeline = items.sort(
      (a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id
    );
    stopsBySession.set(sessionId, buildSessionActivitySummary(timeline).stops);
  }
  return stopsBySession;
}

/** Copy event-level IPs onto session rows that were created without one. */
export async function backfillSessionIpsFromEvents(sessionIds: string[]): Promise<void> {
  if (!sessionIds.length) return;
  await ensureAnalyticsSchema();
  const placeholders = sessionIds.map(() => "?").join(", ");
  await sqlRun(
    `UPDATE portal_sessions
     SET client_ip = (
       SELECT e.client_ip FROM portal_events e
       WHERE e.session_id = portal_sessions.id
         AND e.client_ip IS NOT NULL AND TRIM(e.client_ip) != ''
       ORDER BY datetime(e.created_at) DESC LIMIT 1
     )
     WHERE id IN (${placeholders})
       AND (client_ip IS NULL OR TRIM(client_ip) = '')
       AND EXISTS (
         SELECT 1 FROM portal_events e
         WHERE e.session_id = portal_sessions.id
           AND e.client_ip IS NOT NULL AND TRIM(e.client_ip) != ''
       )`,
    sessionIds
  );
}

async function refreshSessionClientIps(
  sessions: NavSessionRow[],
  sessionIds: string[]
): Promise<NavSessionRow[]> {
  if (!sessionIds.length) return sessions;
  await backfillSessionIpsFromEvents(sessionIds);
  const placeholders = sessionIds.map(() => "?").join(", ");
  const ipRows = await sqlAll<{ id: string; client_ip: string | null }>(
    `SELECT id, client_ip FROM portal_sessions WHERE id IN (${placeholders})`,
    sessionIds
  );
  const ipById = new Map(ipRows.map((row) => [row.id, row.client_ip]));
  return sessions.map((session) => {
    let client_ip = ipById.get(session.id) ?? session.client_ip;
    if (process.env.NODE_ENV === "development" && !client_ip?.trim()) {
      client_ip = "127.0.0.1";
    }
    return { ...session, client_ip };
  });
}

async function loadCandidateSessions(query: PortalActivityQuery): Promise<{
  sessions: NavSessionRow[];
  sinceUtc: string | null;
}> {
  const sinceUtc = resolveSinceUtc(query);
  let sessions: NavSessionRow[];
  await backfillSessionAuthRoleFromAudit();

  if (query.range === "event_day" && query.eventDate) {
    const sessionIds = await listSessionIdsForEventDay(query.eventDate);
    sessions = await listSessionsByIds(sessionIds);
    if (query.role !== "all") {
      sessions = sessions.filter((s) => sessionMatchesRole(s, query.role));
    }
  } else if (query.range === "all") {
    await backfillPortalSessionsFromAudit();
    sessions = await listSessionsAllTime(query.role);
  } else {
    sessions = await listSessionsInWindow(sinceUtc!, query.role);
  }

  if (query.sessionId) {
    const pinned = sessions.find((s) => s.id === query.sessionId);
    if (!pinned) {
      const extra = await listSessionsByIds([query.sessionId], { enrichGeo: true });
      if (extra[0]) {
        sessions = [extra[0], ...sessions.filter((s) => s.id !== query.sessionId)];
      }
    } else {
      sessions = [pinned, ...sessions.filter((s) => s.id !== query.sessionId)];
    }
  }

  return { sessions, sinceUtc };
}

/**
 * Lightweight portal-log list: session rows + counts + summary stops.
 * Full timelines are loaded on expand via getPortalSessionTimeline.
 */
export async function listPortalActivitySessions(
  query: PortalActivityQuery,
  options?: { limit?: number }
): Promise<PortalActivityListResult> {
  const limit = options?.limit ?? PORTAL_LOG_SESSION_LIMIT;
  const { sessions: loadedSessions, sinceUtc } = await loadCandidateSessions(query);
  // Bound Turso IN (...) counts/samples even on "all" range.
  const candidateSessions =
    loadedSessions.length > PORTAL_LOG_CANDIDATE_CAP
      ? loadedSessions.slice(0, PORTAL_LOG_CANDIDATE_CAP)
      : loadedSessions;
  const eventDateFilter = query.range === "event_day" ? query.eventDate : null;
  const candidateIds = candidateSessions.map((s) => s.id);

  const needPages = query.kind !== "changes";
  const needChanges = query.kind !== "pages";

  // listEnrichedCaptainIpMappings ensures captain_ip_mappings + portal_devices DDL
  // (device schema may ALTER mappings — must finish before a concurrent devices list on cold start).
  const [pageCounts, changeCounts, enrichedMappings] = await Promise.all([
    needPages
      ? countPagesBySession(candidateIds, sinceUtc, eventDateFilter)
      : Promise.resolve(new Map<string, number>()),
    needChanges
      ? countChangesBySession(candidateIds, sinceUtc, eventDateFilter)
      : Promise.resolve(new Map<string, number>()),
    listEnrichedCaptainIpMappings(),
  ]);
  const portalDevices = await (await import("./portal-devices")).listPortalDevices();

  const lookup = buildCaptainIpLookup(enrichedMappings);

  const activeSessions = enrichSessionsLight(
    candidateSessions,
    lookup,
    enrichedMappings,
    portalDevices
  )
    .filter((session) => captainMatchesFilter(session.captain_name, query.captain))
    .filter((session) => {
      const page_count = pageCounts.get(session.id) ?? 0;
      const change_count = changeCounts.get(session.id) ?? 0;
      if (query.kind === "pages") return page_count > 0;
      if (query.kind === "changes") return change_count > 0;
      return page_count > 0 || change_count > 0;
    });

  const newestFirst = sortByLastSeenDesc(activeSessions);
  const truncated = newestFirst.length > limit;
  const sessions = truncated ? newestFirst.slice(0, limit) : newestFirst;
  const sessionIds = sessions.map((s) => s.id);

  const [pageSamples, changeSamples] = await Promise.all([
    needPages
      ? listSummaryPageSamples(sessionIds, sinceUtc, eventDateFilter)
      : Promise.resolve([] as SummaryPageSample[]),
    needChanges
      ? listSummaryChangeSamples(sessionIds, sinceUtc, eventDateFilter)
      : Promise.resolve([] as SummaryChangeSample[]),
  ]);

  const summaryBySession = buildSummaryStopsFromSamples(
    pageSamples,
    changeSamples,
    query.kind
  );

  const views: PortalActivitySessionView[] = sessions.map((session) => ({
    session,
    captain_name: session.captain_name,
    location_label: session.location_label,
    timeline: [] as PortalTimelineEntry[],
    summary_stops: summaryBySession.get(session.id) ?? [],
    page_count: pageCounts.get(session.id) ?? 0,
    change_count: changeCounts.get(session.id) ?? 0,
  }));

  return { sessions: views, truncated, limit };
}

/** Full nav + activity timeline for one session (expand / pin). */
export async function getPortalSessionTimeline(
  sessionId: string,
  query: Pick<PortalActivityQuery, "kind" | "range" | "eventDate">
): Promise<PortalTimelineEntry[]> {
  const sinceUtc = resolveSinceUtc({
    range: query.range,
    eventDate: query.eventDate,
    role: "all",
    captain: null,
    kind: query.kind,
    sessionId,
    view: "sessions",
    mode: "traffic",
  });
  const eventDateFilter = query.range === "event_day" ? query.eventDate : null;

  const [events, audits] = await Promise.all([
    listNavEventsForSessionsSince([sessionId], sinceUtc),
    listAuditForSessionsSince([sessionId], sinceUtc),
  ]);

  return buildSessionTimeline(events, audits, {
    kind: query.kind,
    eventDate: eventDateFilter,
    sinceUtc,
  });
}

/** Load one session with full timeline (pinned highlight on portal-log). */
export async function getPortalActivitySessionWithTimeline(
  sessionId: string,
  query: PortalActivityQuery
): Promise<PortalActivitySessionView | null> {
  const sessions = await listSessionsByIds([sessionId], { enrichGeo: true });
  let session = sessions[0];
  if (!session) return null;

  session = (await refreshSessionClientIps([session], [sessionId]))[0]!;
  const sinceUtc = resolveSinceUtc(query);
  const eventDateFilter = query.range === "event_day" ? query.eventDate : null;

  const [events, audits, enrichedMappings, portalDevices] = await Promise.all([
    listNavEventsForSessionsSince([sessionId], sinceUtc),
    listAuditForSessionsSince([sessionId], sinceUtc),
    listEnrichedCaptainIpMappings(),
    (await import("./portal-devices")).listPortalDevices(),
  ]);
  const lookup = buildCaptainIpLookup(enrichedMappings);
  const eventsBySession = new Map<string, NavEventRow[]>([[sessionId, events]]);
  const enriched = enrichSessions(
    [session],
    eventsBySession,
    lookup,
    enrichedMappings,
    portalDevices
  )[0]!;

  const timeline = buildSessionTimeline(events, audits, {
    kind: query.kind,
    eventDate: eventDateFilter,
    sinceUtc,
  });
  if (!timeline.length) return null;

  return {
    session: enriched,
    captain_name: enriched.captain_name,
    location_label: enriched.location_label,
    timeline,
    summary_stops: buildSessionActivitySummary(timeline).stops,
    page_count: timeline.filter((item) => item.kind === "page").length,
    change_count: timeline.filter((item) => item.kind === "change").length,
  };
}

export async function listPortalLogPeople(): Promise<string[]> {
  const { listPortalDevices, isConfirmedPortalDevice, portalDeviceDisplayName } =
    await import("./portal-devices");
  const [devices, options] = await Promise.all([
    listPortalDevices(),
    listDayCaptainOptions(),
  ]);
  const names = new Set<string>();
  for (const device of devices) {
    if (!isConfirmedPortalDevice(device)) continue;
    const name = portalDeviceDisplayName(device).trim();
    if (name) names.add(name);
  }
  for (const option of options) {
    const name = option.captain_name.trim();
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

async function listSessionsForClientIps(
  ips: string[],
  sinceUtc: string | null
): Promise<NavSessionRow[]> {
  await ensureAnalyticsSchema();
  if (!ips.length) return [];
  const placeholders = ips.map(() => "?").join(", ");
  const params: (string | number)[] = [...ips];
  let sinceClause = "";
  if (sinceUtc) {
    sinceClause = "AND s.last_seen_at >= ?";
    params.push(sinceUtc);
  }
  return sqlAll<NavSessionRow>(
    `${SESSION_SELECT}
     WHERE s.client_ip IN (${placeholders})
       ${sinceClause}
     ORDER BY s.last_seen_at DESC`,
    params
  );
}

export async function listPortalPersonHistory(query: PortalActivityQuery): Promise<{
  who: string;
  ips: string[];
  days: PortalHistoryDay[];
  page_count: number;
  change_count: number;
}> {
  const who = query.captain?.trim() ?? "";
  if (!who) {
    return { who: "", ips: [], days: [], page_count: 0, change_count: 0 };
  }

  const { listPortalDevices, isConfirmedPortalDevice, portalDeviceDisplayName } =
    await import("./portal-devices");
  const [devices, mappings] = await Promise.all([
    listPortalDevices(),
    listEnrichedCaptainIpMappings(),
  ]);
  const ips = new Set<string>();
  for (const device of devices) {
    if (!isConfirmedPortalDevice(device)) continue;
    if (!captainMatchesFilter(portalDeviceDisplayName(device), who)) continue;
    const ip = device.client_ip.trim();
    if (ip) ips.add(ip);
  }
  for (const row of mappings) {
    if (!captainMatchesFilter(row.display_name, who) && !captainMatchesFilter(row.notes, who)) {
      continue;
    }
    const ip = row.client_ip.trim();
    if (ip) ips.add(ip);
  }

  const sinceUtc = resolveSinceUtc(query);
  const sessions = await listSessionsForClientIps([...ips], sinceUtc);
  const sessionIds = sessions.map((row) => row.id);
  const eventDateFilter = query.range === "event_day" ? query.eventDate : null;
  const [events, audits] = await Promise.all([
    listNavEventsForSessionsSince(sessionIds, sinceUtc),
    listAuditForSessionsSince(sessionIds, sinceUtc),
  ]);
  const eventsBySession = new Map<string, NavEventRow[]>();
  for (const event of events) {
    const list = eventsBySession.get(event.session_id) ?? [];
    list.push(event);
    eventsBySession.set(event.session_id, list);
  }
  const auditsBySession = new Map<string, AuditLogEntry[]>();
  for (const audit of audits) {
    const sid = audit.session_id?.trim();
    if (!sid) continue;
    const list = auditsBySession.get(sid) ?? [];
    list.push(audit);
    auditsBySession.set(sid, list);
  }

  const timeline: PortalTimelineEntry[] = [];
  for (const session of sessions) {
    timeline.push(
      ...buildSessionTimeline(eventsBySession.get(session.id) ?? [], auditsBySession.get(session.id) ?? [], {
        kind: query.kind,
        eventDate: eventDateFilter,
        sinceUtc,
      })
    );
  }

  const days = groupTimelineEntriesByDay(timeline);
  return {
    who,
    ips: [...ips].sort(),
    days,
    page_count: timeline.filter((item) => item.kind === "page").length,
    change_count: timeline.filter((item) => item.kind === "change").length,
  };
}