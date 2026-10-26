import { getClientIp } from "./client-ip";
import type { ClientGeo } from "./client-geo";
import { hasGeoData, lookupGeoFromIp, resolveClientGeo } from "./client-geo";
import { sqlGet } from "./db-client";
import { ensureAnalyticsSchema, updatePortalSessionGeo } from "./portal-analytics";

export type SessionGeoFields = {
  geo_country: string | null;
  geo_region: string | null;
  geo_city: string | null;
  geo_timezone: string | null;
  geo_source: string | null;
};

type GeoEnrichableRow = {
  id: string;
  client_ip: string | null;
} & Partial<SessionGeoFields>;

/** Capture geo on the current request (Vercel headers, then IP lookup). */
export async function captureSessionGeo(sessionId: string): Promise<void> {
  await ensureAnalyticsSchema();
  const existing = await sqlGet<{ geo_source: string | null }>(
    "SELECT geo_source FROM portal_sessions WHERE id = ?",
    [sessionId]
  );
  if (existing?.geo_source) return;

  const clientIp = await getClientIp();
  const geo = await resolveClientGeo(clientIp);
  if (!hasGeoData(geo)) return;
  await updatePortalSessionGeo(sessionId, geo);
}

function sessionNeedsGeo(
  row: GeoEnrichableRow & {
    geo_latitude?: number | null;
    geo_longitude?: number | null;
    geo_source?: string | null;
  }
): boolean {
  if (row.geo_source === "browser") return false;
  if (row.geo_latitude != null && row.geo_longitude != null) return false;
  return Boolean(row.client_ip) && !row.geo_city && !row.geo_region && !row.geo_country;
}

async function loadSessionGeoFields(sessionId: string): Promise<SessionGeoFields | undefined> {
  return sqlGet<SessionGeoFields>(
    `SELECT geo_country, geo_region, geo_city, geo_timezone, geo_source
     FROM portal_sessions WHERE id = ?`,
    [sessionId]
  );
}

/** Backfill geo for stored IPs (e.g. older sessions or local dev). */
export async function enrichSessionGeoFromIp(
  sessionId: string,
  clientIp: string
): Promise<SessionGeoFields | undefined> {
  const geo: ClientGeo = await lookupGeoFromIp(clientIp);
  if (!hasGeoData(geo)) return undefined;
  await updatePortalSessionGeo(sessionId, geo);
  return loadSessionGeoFields(sessionId);
}

const MAX_ENRICH_PER_REQUEST = 8;

/** Lazy enrichment for nav log rows missing geo. */
export async function enrichMissingSessionGeo<T extends GeoEnrichableRow>(
  rows: T[],
  limit = MAX_ENRICH_PER_REQUEST
): Promise<T[]> {
  if (process.env.NODE_ENV === "development") {
    return rows;
  }
  const enriched = [...rows];
  let remaining = limit;

  for (let i = 0; i < enriched.length && remaining > 0; i++) {
    const row = enriched[i];
    if (!sessionNeedsGeo(row)) continue;
    const updated = await enrichSessionGeoFromIp(row.id, row.client_ip!);
    if (updated) {
      enriched[i] = { ...row, ...updated };
      remaining -= 1;
    }
  }

  return enriched;
}