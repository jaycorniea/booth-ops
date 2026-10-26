/** SQLite `datetime('now')` values are UTC. Display them in the event timezone. */

import { getActiveEventSettings } from "./event-settings";
import { getBoothConfig } from "./booth-config";

export function getPortalTimeZone(): string {
  try {
    return getActiveEventSettings().timezone || getBoothConfig().org.timezone;
  } catch {
    return getBoothConfig().org.timezone;
  }
}

const SQLITE_UTC_RE = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/;

export function parseSqliteUtc(timestamp: string): Date | null {
  const match = SQLITE_UTC_RE.exec(timestamp.trim());
  if (!match) return null;
  const iso = `${match[1]}T${match[2]}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
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
