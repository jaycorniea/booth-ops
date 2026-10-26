import { headers } from "next/headers";

export type GeoSource = "vercel" | "ip_lookup" | "browser";

export interface ClientGeo {
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  source: GeoSource | null;
}

export const EMPTY_CLIENT_GEO: ClientGeo = {
  country: null,
  region: null,
  city: null,
  timezone: null,
  latitude: null,
  longitude: null,
  source: null,
};

function trimHeader(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 120) : null;
}

function parseCoord(value: string | null): number | null {
  if (!value?.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Geo from Vercel edge headers (production deployments). */
export async function getVercelGeo(): Promise<ClientGeo> {
  const h = await headers();
  const country = trimHeader(h.get("x-vercel-ip-country"));
  const region = trimHeader(h.get("x-vercel-ip-country-region"));
  const city = trimHeader(h.get("x-vercel-ip-city"));
  const timezone = trimHeader(h.get("x-vercel-ip-timezone"));
  const latitude = parseCoord(h.get("x-vercel-ip-latitude"));
  const longitude = parseCoord(h.get("x-vercel-ip-longitude"));

  if (!country && !region && !city && !timezone && latitude == null && longitude == null) {
    return { ...EMPTY_CLIENT_GEO };
  }

  return {
    country,
    region,
    city,
    timezone,
    latitude,
    longitude,
    source: "vercel",
  };
}

export function isPrivateIp(ip: string | null | undefined): boolean {
  if (!ip?.trim()) return true;
  const value = ip.trim().toLowerCase();
  if (value === "::1" || value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd")) {
    return true;
  }
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return false;
  const [a, b] = value.split(".").map(Number);
  if (a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function hasGeoData(geo: ClientGeo | null | undefined): boolean {
  if (!geo) return false;
  return Boolean(
    geo.country || geo.region || geo.city || geo.timezone || geo.latitude != null || geo.longitude != null
  );
}

interface IpApiResponse {
  status?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
}

/** Fallback geo lookup from a public IP (ip-api.com). */
export async function lookupGeoFromIp(ip: string): Promise<ClientGeo> {
  if (isPrivateIp(ip)) return { ...EMPTY_CLIENT_GEO };

  const url = `https://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return { ...EMPTY_CLIENT_GEO };
    const data = (await res.json()) as IpApiResponse;
    if (data.status !== "success") return { ...EMPTY_CLIENT_GEO };

    return {
      country: data.countryCode?.trim() || data.country?.trim() || null,
      region: data.regionName?.trim() || data.region?.trim() || null,
      city: data.city?.trim() || null,
      timezone: data.timezone?.trim() || null,
      latitude: typeof data.lat === "number" ? data.lat : null,
      longitude: typeof data.lon === "number" ? data.lon : null,
      source: "ip_lookup",
    };
  } catch {
    return { ...EMPTY_CLIENT_GEO };
  }
}

/** Prefer Vercel headers; fall back to IP lookup when absent. */
export async function resolveClientGeo(clientIp: string | null): Promise<ClientGeo> {
  const vercel = await getVercelGeo();
  if (hasGeoData(vercel)) return vercel;
  if (!clientIp || isPrivateIp(clientIp)) return { ...EMPTY_CLIENT_GEO };
  return lookupGeoFromIp(clientIp);
}

export function formatGeoCoords(latitude: number, longitude: number, precision = 5): string {
  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
}

export function formatGeoLabel(geo: {
  geo_city?: string | null;
  geo_region?: string | null;
  geo_country?: string | null;
  geo_latitude?: number | null;
  geo_longitude?: number | null;
  geo_source?: string | null;
  geo_accuracy?: number | null;
}): string {
  const hasBrowserCoords =
    geo.geo_source === "browser" &&
    geo.geo_latitude != null &&
    geo.geo_longitude != null &&
    Number.isFinite(geo.geo_latitude) &&
    Number.isFinite(geo.geo_longitude);

  const place = [geo.geo_city, geo.geo_region, geo.geo_country].filter(Boolean).join(", ");

  if (hasBrowserCoords) {
    const coords = formatGeoCoords(geo.geo_latitude!, geo.geo_longitude!);
    const accuracy =
      geo.geo_accuracy != null && geo.geo_accuracy > 0
        ? ` ±${Math.round(geo.geo_accuracy)}m`
        : "";
    return place ? `${place} · ${coords}${accuracy}` : `${coords}${accuracy}`;
  }

  return place || "—";
}