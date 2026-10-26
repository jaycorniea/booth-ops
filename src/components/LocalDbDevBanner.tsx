import { getStorageMode } from "@/lib/db-client";

/** Dev-only reminder when reading/writing `data/booth.db` instead of Turso. */
export function LocalDbDevBanner() {
  if (process.env.NODE_ENV !== "development") return null;
  if (getStorageMode() !== "file") return null;

  return (
    <div className="no-print border-b border-amber-200 bg-amber-50 px-3 py-1 text-center text-[11px] leading-snug text-amber-950">
      Local DB: <code className="font-mono">data/booth.db</code>
      {" — "}not Turso. Missing prod data? Set{" "}
      <code className="font-mono">PORTAL_LOCAL_DB=0</code> in{" "}
      <code className="font-mono">.env.local</code> and restart.
    </div>
  );
}
