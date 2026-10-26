import { alertsFromAuditEvents } from "./alerts-from-audit";
import type { PortalAlert } from "./alerts-types";
import { isE2ePortalAlert } from "./e2e-artifacts";
import {
  ensureAuditSchema,
  listAuditLogAfterId,
  listAuditLogByIds,
  type AuditLogEntry,
} from "./audit-log";
import { getShiftById } from "./db";
import { sqlAll, sqlBatch, sqlGet, sqlRun } from "./db-client";
import { getShiftScheduleEntry } from "./event-dates";
import { centralDateString, centralRollingWindowStartUtc } from "./portal-time";

const SYNC_CURSOR_KEY = "sync_after_audit_id";

interface PortalAlertRow {
  id: number;
  dedupe_key: string;
  severity: PortalAlert["severity"];
  category: PortalAlert["category"];
  title: string;
  detail: string;
  href: string;
  at: string;
  audit_id: number | null;
}

let schemaReady = false;

export async function ensurePortalAlertsSchema(): Promise<void> {
  if (schemaReady) return;
  await sqlBatch([
    {
      sql: `
        CREATE TABLE IF NOT EXISTS portal_alerts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          dedupe_key TEXT NOT NULL UNIQUE,
          severity TEXT NOT NULL,
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          detail TEXT NOT NULL,
          href TEXT NOT NULL,
          at TEXT NOT NULL,
          audit_id INTEGER,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `,
    },
    {
      sql: `
        CREATE TABLE IF NOT EXISTS portal_alert_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `,
    },
  ]);
  schemaReady = true;
}

async function getSyncCursor(): Promise<number> {
  await ensurePortalAlertsSchema();
  const row = await sqlGet<{ value: string }>(
    "SELECT value FROM portal_alert_state WHERE key = ?",
    [SYNC_CURSOR_KEY]
  );
  if (row?.value !== undefined) {
    const parsed = Number(row.value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  await ensureAuditSchema();
  const maxRow = await sqlGet<{ max_id: number | null }>(
    "SELECT MAX(id) AS max_id FROM audit_log"
  );
  const maxId = maxRow?.max_id ?? 0;
  await setSyncCursor(maxId);
  return maxId;
}

async function setSyncCursor(auditId: number): Promise<void> {
  await sqlRun(
    `INSERT INTO portal_alert_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [SYNC_CURSOR_KEY, String(auditId)]
  );
}

function rowToPortalAlert(row: PortalAlertRow): PortalAlert {
  return {
    id: String(row.id),
    severity: row.severity,
    category: row.category,
    title: row.title,
    detail: row.detail,
    href: row.href,
    at: row.at,
    dedupeKey: row.dedupe_key,
  };
}

function auditIdFromDedupeKey(dedupeKey: string): number | null {
  const match = dedupeKey.match(/:(\d+)(?::|$)/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

function isEventShiftNum(n: number): boolean {
  return Number.isInteger(n) && Boolean(getShiftScheduleEntry(n));
}

/** Map shift audit rows whose entity_id is a database id onto event_date:shift_num. */
async function withResolvedShiftEntityIds(entries: AuditLogEntry[]): Promise<AuditLogEntry[]> {
  const out: AuditLogEntry[] = [];
  for (const entry of entries) {
    if (entry.entity_type !== "shift") {
      out.push(entry);
      continue;
    }
    const asNum = Number(entry.entity_id);
    if (isEventShiftNum(asNum) || entry.entity_id.includes(":")) {
      out.push(entry);
      continue;
    }
    if (!Number.isFinite(asNum)) {
      out.push(entry);
      continue;
    }
    const shift = await getShiftById(asNum);
    if (!shift) {
      out.push(entry);
      continue;
    }
    out.push({
      ...entry,
      entity_id: `${shift.event_date}:${shift.shift_num}`,
      event_date: entry.event_date || shift.event_date,
    });
  }
  return out;
}

/** Rewrite stored shift-slot titles so they never show a database row id. */
async function relabelStoredShiftSlotAlerts(today: string): Promise<void> {
  await ensurePortalAlertsSchema();
  const rows = await sqlAll<PortalAlertRow>(
    `SELECT id, dedupe_key, severity, category, title, detail, href, at, audit_id
     FROM portal_alerts
     WHERE category IN ('event.shift_slot_opened', 'event.no_show')`
  );
  const auditIds = [
    ...new Set(
      rows
        .map((row) => row.audit_id)
        .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
    ),
  ];
  if (!auditIds.length) return;

  const derived = alertsFromAuditEvents(
    await withResolvedShiftEntityIds(await listAuditLogByIds(auditIds)),
    "1970-01-01 00:00:00",
    today
  );
  const byDedupe = new Map(derived.map((alert) => [alert.dedupeKey, alert]));
  const updates = [];
  for (const row of rows) {
    const next = byDedupe.get(row.dedupe_key);
    if (!next || next.title === row.title) continue;
    updates.push({
      sql: "UPDATE portal_alerts SET title = ? WHERE id = ?",
      args: [next.title, row.id],
    });
  }
  if (updates.length) await sqlBatch(updates);
}

/** Copy new audit events into portal_alerts. Audit log is never modified. */
export async function syncPortalAlertsFromAudit(today = centralDateString()): Promise<void> {
  await ensurePortalAlertsSchema();
  const cursor = await getSyncCursor();
  const entries = await listAuditLogAfterId(cursor);
  if (entries.length) {
    const derived = alertsFromAuditEvents(
      await withResolvedShiftEntityIds(entries),
      "1970-01-01 00:00:00",
      today
    );
    if (derived.length) {
      await sqlBatch(
        derived.map((alert) => ({
          sql: `INSERT OR IGNORE INTO portal_alerts
                (dedupe_key, severity, category, title, detail, href, at, audit_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            alert.dedupeKey,
            alert.severity,
            alert.category,
            alert.title,
            alert.detail,
            alert.href,
            alert.at,
            auditIdFromDedupeKey(alert.dedupeKey),
          ],
        }))
      );
    }
    await setSyncCursor(entries[entries.length - 1]!.id);
  }

  await relabelStoredShiftSlotAlerts(today);
  await purgeE2eStoredPortalAlerts();
}

async function purgeE2eStoredPortalAlerts(): Promise<void> {
  await sqlRun(
    `DELETE FROM portal_alerts
     WHERE title GLOB '*E2E*'
        OR title GLOB '*e2e*@example.com*'
        OR detail GLOB '*e2e note*'`
  );
}

export async function listStoredPortalAlerts(
  rollingDays = 7
): Promise<PortalAlert[]> {
  await ensurePortalAlertsSchema();
  const sinceUtc = centralRollingWindowStartUtc(rollingDays);
  const rows = await sqlAll<PortalAlertRow>(
    `SELECT id, dedupe_key, severity, category, title, detail, href, at, audit_id
     FROM portal_alerts
     WHERE at >= ?
     ORDER BY at DESC, id DESC`,
    [sinceUtc]
  );
  return rows.map(rowToPortalAlert).filter((alert) => !isE2ePortalAlert(alert));
}

/** Delete stored alerts only — nav/activity audit history stays intact. */
export async function clearPortalAlerts(): Promise<void> {
  await ensurePortalAlertsSchema();
  await sqlRun("DELETE FROM portal_alerts");
  await ensureAuditSchema();
  const maxRow = await sqlGet<{ max_id: number | null }>(
    "SELECT MAX(id) AS max_id FROM audit_log"
  );
  await setSyncCursor(maxRow?.max_id ?? 0);
}