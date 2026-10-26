import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "portal-alerts-store-test-"));
const dbPath = path.join(tmpDir, "booth.db");

describe("portal-alerts-store", () => {
  beforeEach(async () => {
    vi.resetModules();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    process.env.TURSO_DATABASE_URL = `file:${dbPath}`;
    delete process.env.TURSO_AUTH_TOKEN;
    const { resetDbClientForTests } = await import("./db-client");
    resetDbClientForTests();
    const { ensureAuditSchema } = await import("./audit-log");
    await ensureAuditSchema();
  });

  afterEach(() => {
    delete process.env.TURSO_DATABASE_URL;
  });

  it("clear deletes portal_alerts but keeps audit_log", async () => {
    const { sqlRun, sqlGet } = await import("./db-client");
    const { syncPortalAlertsFromAudit, clearPortalAlerts, listStoredPortalAlerts } = await import(
      "./portal-alerts-store"
    );

    const { ensurePortalAlertsSchema } = await import("./portal-alerts-store");
    await ensurePortalAlertsSchema();
    await sqlRun(
      `INSERT INTO portal_alert_state (key, value) VALUES ('sync_after_audit_id', '0')`
    );
    const { centralDateString, toSqliteUtc } = await import("./portal-time");
    const today = centralDateString();
    const auditAt = toSqliteUtc(new Date());

    await sqlRun(
      `INSERT INTO audit_log (actor_role, entity_type, entity_id, operation, summary, changes, created_at)
       VALUES ('admin', 'on_call', '1', 'create', 'Added Pat', '{}', ?)`,
      [auditAt]
    );

    await syncPortalAlertsFromAudit(today);
    expect((await listStoredPortalAlerts(7)).length).toBe(1);

    await clearPortalAlerts();
    expect((await listStoredPortalAlerts(7)).length).toBe(0);

    const auditCount = await sqlGet<{ c: number }>("SELECT COUNT(*) AS c FROM audit_log");
    expect(auditCount?.c).toBe(1);
  });
});