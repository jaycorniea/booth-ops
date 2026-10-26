import { getAuthRole, type AuthRole } from "./auth";
import type { FieldChange } from "./audit-format";
import { sqlAll, sqlRun } from "./db-client";
import { getVisitorSessionId } from "./visitor-session";

export type { FieldChange } from "./audit-format";
export { formatFieldChange, parseAuditChanges } from "./audit-format";

export type AuditOperation = "create" | "update" | "delete";

export function asAuditRecord<T extends object>(row: T): Record<string, unknown> {
  return row as unknown as Record<string, unknown>;
}

export interface AuditLogEntry {
  id: number;
  actor_role: AuthRole;
  session_id: string | null;
  entity_type: string;
  entity_id: string;
  operation: AuditOperation;
  summary: string;
  changes: string;
  event_date: string | null;
  created_at: string;
}

const IGNORE_FIELDS = new Set([
  "updated_at",
  "created_at",
  "last_seen_at",
  "started_at",
  "ended_at",
]);

let schemaReady = false;

export async function ensureAuditSchema(): Promise<void> {
  if (schemaReady) return;
  await sqlRun(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_role TEXT NOT NULL,
      session_id TEXT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      changes TEXT NOT NULL DEFAULT '{}',
      event_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await sqlRun(
    "CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC)"
  );
  await sqlRun(
    "CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id)"
  );
  await sqlRun(
    "CREATE INDEX IF NOT EXISTS idx_audit_log_session ON audit_log(session_id, created_at)"
  );
  schemaReady = true;
}

export function diffRecords(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  fields?: string[]
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {};
  const keys = new Set<string>([
    ...(before ? Object.keys(before) : []),
    ...(after ? Object.keys(after) : []),
  ]);

  for (const key of keys) {
    if (IGNORE_FIELDS.has(key)) continue;
    if (fields && !fields.includes(key)) continue;

    const fromVal = before?.[key];
    const toVal = after?.[key];
    const fromNorm = normalizeValue(fromVal);
    const toNorm = normalizeValue(toVal);

    if (fromNorm === toNorm) continue;

    const change: FieldChange = {};
    if (fromVal !== undefined) change.from = fromNorm;
    if (toVal !== undefined) change.to = toNorm;
    changes[key] = change;
  }

  return changes;
}

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  return JSON.stringify(value);
}

export async function recordAudit(params: {
  entityType: string;
  entityId: string | number;
  operation: AuditOperation;
  summary?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  fields?: string[];
  eventDate?: string | null;
  actorRole?: AuthRole;
  sessionId?: string | null;
}): Promise<void> {
  try {
    await ensureAuditSchema();

    const changes = diffRecords(params.before ?? null, params.after ?? null, params.fields);
    if (params.operation === "update" && Object.keys(changes).length === 0) return;

    const actorRole = params.actorRole ?? (await getAuthRole()) ?? "captain";
    const sessionId = params.sessionId ?? (await getVisitorSessionId());

    const summary =
      params.summary ??
      `${params.operation} ${params.entityType} ${String(params.entityId)}`;

    await sqlRun(
      `INSERT INTO audit_log (
        actor_role, session_id, entity_type, entity_id, operation, summary, changes, event_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actorRole,
        sessionId,
        params.entityType,
        String(params.entityId),
        params.operation,
        summary,
        JSON.stringify(changes),
        params.eventDate ?? null,
      ]
    );

    try {
      const { shouldInferCaptainIp, recordCaptainIpInference } = await import("./captain-ip-mappings");
      if (shouldInferCaptainIp(actorRole, params.eventDate)) {
        const { getClientIp } = await import("./client-ip");
        const clientIp = await getClientIp();
        if (clientIp) {
          await recordCaptainIpInference({
            clientIp,
            eventDate: params.eventDate!,
            sessionId,
            authRole: actorRole,
          });
        }
      }
    } catch (inferErr) {
      console.error("[audit-log] ip-inference", params.entityType, inferErr);
    }
  } catch (err) {
    console.error("[audit-log]", params.entityType, params.operation, err);
  }
}

export async function listAuditLog(
  limit = 100,
  offset = 0,
  options?: { sessionId?: string | null }
): Promise<AuditLogEntry[]> {
  await ensureAuditSchema();
  const sessionId = options?.sessionId?.trim();
  if (sessionId) {
    return sqlAll<AuditLogEntry>(
      `SELECT id, actor_role, session_id, entity_type, entity_id, operation,
              summary, changes, event_date, created_at
       FROM audit_log
       WHERE session_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [sessionId, limit, offset]
    );
  }
  return sqlAll<AuditLogEntry>(
    `SELECT id, actor_role, session_id, entity_type, entity_id, operation,
            summary, changes, event_date, created_at
     FROM audit_log
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

export async function countAuditBySession(
  sessionIds: string[]
): Promise<Map<string, number>> {
  await ensureAuditSchema();
  const counts = new Map<string, number>();
  if (!sessionIds.length) return counts;

  const placeholders = sessionIds.map(() => "?").join(", ");
  const rows = await sqlAll<{ session_id: string; count: number }>(
    `SELECT session_id, COUNT(*) as count
     FROM audit_log
     WHERE session_id IN (${placeholders})
     GROUP BY session_id`,
    sessionIds
  );
  for (const row of rows) {
    counts.set(row.session_id, row.count);
  }
  return counts;
}

export async function listShiftAuditLogAsc(): Promise<AuditLogEntry[]> {
  await ensureAuditSchema();
  return sqlAll<AuditLogEntry>(
    `SELECT id, actor_role, session_id, entity_type, entity_id, operation,
            summary, changes, event_date, created_at
     FROM audit_log
     WHERE entity_type = 'shift'
     ORDER BY created_at ASC, id ASC`
  );
}

export async function listAuditLogAfterId(afterId: number): Promise<AuditLogEntry[]> {
  await ensureAuditSchema();
  return sqlAll<AuditLogEntry>(
    `SELECT id, actor_role, session_id, entity_type, entity_id, operation,
            summary, changes, event_date, created_at
     FROM audit_log
     WHERE id > ?
     ORDER BY id ASC`,
    [afterId]
  );
}

export async function listAuditLogByIds(ids: number[]): Promise<AuditLogEntry[]> {
  await ensureAuditSchema();
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(", ");
  return sqlAll<AuditLogEntry>(
    `SELECT id, actor_role, session_id, entity_type, entity_id, operation,
            summary, changes, event_date, created_at
     FROM audit_log
     WHERE id IN (${placeholders})`,
    ids
  );
}