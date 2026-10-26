import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildBrowserClientGeo,
  formatGeoMapUrl,
  isValidBrowserCoords,
  normalizeAccuracy,
  reverseGeocodeBrowserCoords,
} from "./browser-geo";

describe("browser-geo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("validates coordinates", () => {
    expect(isValidBrowserCoords(44.9778, -93.265)).toBe(true);
    expect(isValidBrowserCoords(0, 0)).toBe(false);
    expect(isValidBrowserCoords(91, 0)).toBe(false);
    expect(isValidBrowserCoords(Number.NaN, 1)).toBe(false);
  });

  it("normalizes accuracy", () => {
    expect(normalizeAccuracy(12.34)).toBe(12.3);
    expect(normalizeAccuracy(0)).toBeNull();
    expect(normalizeAccuracy(null)).toBeNull();
  });

  it("builds browser geo with reverse geocode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          address: {
            city: "Minneapolis",
            state: "Illinois",
            country_code: "us",
          },
        }),
      })
    );

    const geo = await buildBrowserClientGeo({
      latitude: 44.9778,
      longitude: -93.265,
      accuracy: 18,
    });

    expect(geo).toEqual({
      country: "US",
      region: "Illinois",
      city: "Minneapolis",
      timezone: null,
      latitude: 44.9778,
      longitude: -93.265,
      source: "browser",
    });
  });

  it("reverse geocode tolerates failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const place = await reverseGeocodeBrowserCoords(44.9, -93.2);
    expect(place).toEqual({ country: null, region: null, city: null });
  });

  it("formats map URLs", () => {
    expect(formatGeoMapUrl(44.9778, -93.265)).toBe(
      "https://www.google.com/maps?q=44.9778,-93.265"
    );
  });
});