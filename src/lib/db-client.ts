import { createClient, type Client } from "@libsql/client";
import fs from "fs";
import path from "path";

let client: Client | null = null;
let initPromise: Promise<void> | null = null;

export type StorageMode = "turso" | "file";

/** Dev default is local SQLite even when Turso env vars are present. */
function useLocalFileInDev(): boolean {
  return process.env.NODE_ENV === "development" && process.env.PORTAL_LOCAL_DB !== "0";
}

/** Active storage for this process (matches `resolveDbUrl`). */
export function getStorageMode(): StorageMode {
  if (useLocalFileInDev()) return "file";
  return process.env.TURSO_DATABASE_URL ? "turso" : "file";
}

function resolveDbUrl(): string {
  // Dev default: local SQLite (fast). Set PORTAL_LOCAL_DB=0 to use Turso in dev.
  if (useLocalFileInDev()) {
    const dataDir = path.join(process.cwd(), "data");
    fs.mkdirSync(dataDir, { recursive: true });
    return `file:${path.join(dataDir, "booth.db")}`;
  }
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  const dataDir = process.env.VERCEL
    ? path.join("/tmp", "booth-ops")
    : path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return `file:${path.join(dataDir, "booth.db")}`;
}

export function getClient(): Client {
  if (!client) {
    client = createClient({
      url: resolveDbUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function ensureInitialized(init: () => Promise<void>): Promise<void> {
  if (!initPromise) {
    initPromise = init().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
}

/** Test-only: clear cached client between isolated DB file runs. */
export function resetDbClientForTests(): void {
  client = null;
  initPromise = null;
}

type SqlValue = string | number | null;
type SqlArgs = SqlValue[];

function normalizeValue(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  return value;
}

function mapRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = normalizeValue(value);
  }
  return out as T;
}

export async function sqlAll<T = Record<string, unknown>>(sql: string, args: SqlArgs = []): Promise<T[]> {
  const result = await getClient().execute({ sql, args });
  return result.rows.map((row) => mapRow<T>(row as Record<string, unknown>));
}

export async function sqlGet<T = Record<string, unknown>>(sql: string, args: SqlArgs = []): Promise<T | undefined> {
  const rows = await sqlAll<T>(sql, args);
  return rows[0];
}

export async function sqlRun(sql: string, args: SqlArgs = []): Promise<void> {
  await getClient().execute({ sql, args });
}

export async function sqlBatch(stmts: { sql: string; args?: SqlArgs }[]): Promise<void> {
  if (!stmts.length) return;
  await getClient().batch(
    stmts.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    "write"
  );
}

/** Multiple SELECTs in one Turso HTTP round trip. */
export async function sqlBatchRead(
  queries: { sql: string; args?: SqlArgs }[]
): Promise<Record<string, unknown>[][]> {
  if (!queries.length) return [];
  const results = await getClient().batch(
    queries.map((q) => ({ sql: q.sql, args: q.args ?? [] })),
    "read"
  );
  return results.map((result) =>
    result.rows.map((row) => mapRow(row as Record<string, unknown>))
  );
}

/** Lightweight connectivity check — does not run schema migrations. */
export async function pingDatabase(): Promise<boolean> {
  try {
    await getClient().execute("SELECT 1");
    return true;
  } catch {
    return false;
  }
}