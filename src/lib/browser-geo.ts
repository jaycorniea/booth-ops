import type { ClientGeo } from "./client-geo";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

export interface BrowserGeoInput {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

export function isValidBrowserCoords(latitude: number, longitude: number): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return false;
  if (Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001) return false;
  return true;
}

export function normalizeAccuracy(accuracy: number | null | undefined): number | null {
  if (accuracy == null || !Number.isFinite(accuracy) || accuracy <= 0) return null;
  return Math.round(accuracy * 10) / 10;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country_code?: string;
}

interface NominatimResponse {
  address?: NominatimAddress;
}

/** Reverse geocode browser coordinates for nav-log labels (best effort). */
export async function reverseGeocodeBrowserCoords(
  latitude: number,
  longitude: number
): Promise<Pick<ClientGeo, "country" | "region" | "city">> {
  const url = `${NOMINATIM_URL}?format=jsonv2&lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}&zoom=14&addressdetails=1`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "booth-ops/1.0 (ops@example.org)",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return { country: null, region: null, city: null };
    }

    const data = (await res.json()) as NominatimResponse;
    const address = data.address;
    if (!address) {
      return { country: null, region: null, city: null };
    }

    const city =
      address.city?.trim() ||
      address.town?.trim() ||
      address.village?.trim() ||
      address.municipality?.trim() ||
      null;
    const region = address.state?.trim() || address.county?.trim() || null;
    const country = address.country_code?.trim().toUpperCase() || null;

    return { country, region, city };
  } catch {
    return { country: null, region: null, city: null };
  }
}

export async function buildBrowserClientGeo(input: BrowserGeoInput): Promise<ClientGeo | null> {
  const { latitude, longitude } = input;
  if (!isValidBrowserCoords(latitude, longitude)) return null;

  const place = await reverseGeocodeBrowserCoords(latitude, longitude);

  return {
    country: place.country,
    region: place.region,
    city: place.city,
    timezone: null,
    latitude,
    longitude,
    source: "browser",
  };
}

export function formatGeoMapUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}