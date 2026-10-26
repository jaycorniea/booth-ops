/** Portal analytics timestamps are stored in SQLite UTC (`datetime('now')`). */

import { getActiveEventSettings } from "./event-settings";
import { getBoothConfig } from "./booth-config";

export function getPortalTimeZone(): string {
  try {
    return getActiveEventSettings().timezone || getBoothConfig().org.timezone;
  } catch {
    return getBoothConfig().org.timezone;
  }
}

/** @deprecated Use getPortalTimeZone() — value is from booth config. */
export const PORTAL_TIME_ZONE = "America/Chicago";

const SQLITE_UTC_RE = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/;

export function parseSqliteUtc(timestamp: string): Date | null {
  const match = SQLITE_UTC_RE.exec(timestamp.trim());
  if (!match) return null;
  const iso = `${match[1]}T${match[2]}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toSqliteUtc(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export function centralDateString(reference = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: getPortalTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(reference);
}

/** Calendar day (YYYY-MM-DD) for a SQLite UTC audit timestamp. */
export function centralDateFromSqliteUtc(timestamp: string): string {
  const date = parseSqliteUtc(timestamp);
  if (!date) return timestamp.slice(0, 10);
  return centralDateString(date);
}

function timezoneOffsetMs(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return asUtc - date.getTime();
}

/** UTC instant for a local clock time in the configured IANA zone on a given calendar day. */
export function localTimeToUtc(
  ymd: string,
  hour = 0,
  minute = 0,
  second = 0
): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset = timezoneOffsetMs(getPortalTimeZone(), new Date(guess));
  return new Date(guess - offset);
}

export const centralLocalTimeToUtc = localTimeToUtc;

export function centralDayBoundsUtc(reference = new Date()): {
  startUtc: string;
  endUtc: string;
} {
  const ymd = centralDateString(reference);
  const start = centralLocalTimeToUtc(ymd, 0, 0, 0);
  const nextYmd = centralDateString(new Date(start.getTime() + 36 * 60 * 60 * 1000));
  const end = centralLocalTimeToUtc(nextYmd, 0, 0, 0);
  return { startUtc: toSqliteUtc(start), endUtc: toSqliteUtc(end) };
}

export function centralRollingWindowStartUtc(days: number, reference = new Date()): string {
  const { startUtc } = centralDayBoundsUtc(reference);
  const start = parseSqliteUtc(startUtc);
  if (!start) return startUtc;
  return toSqliteUtc(new Date(start.getTime() - days * 24 * 60 * 60 * 1000));
}

export function formatPortalTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) return "—";
  const date = parseSqliteUtc(timestamp);
  if (!date) return timestamp;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: getPortalTimeZone(),
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(date);
}

/** Compact log display: `Jun 22 3:45p` */
export function formatPortalTimestampCompact(timestamp: string | null | undefined): string {
  if (!timestamp) return "—";
  const date = parseSqliteUtc(timestamp);
  if (!date) return timestamp;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: getPortalTimeZone(),
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  const hour = Number(values.hour);
  const suffix = (values.dayPeriod ?? "AM").charAt(0).toLowerCase();
  return `${values.month} ${values.day} ${hour}:${values.minute}${suffix}`;
}

/** Date-only display for roster submitted columns: `Jun 25, 2026` */
export function formatPortalDateSubmitted(timestamp: string | null | undefined): string {
  if (!timestamp) return "—";
  const date = parseSqliteUtc(timestamp);
  if (!date) return timestamp;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: getPortalTimeZone(),
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function portalTimeZoneLabel(): string {
  return getPortalTimeZone();
}

export const PORTAL_TIME_ZONE_LABEL = "local event time";