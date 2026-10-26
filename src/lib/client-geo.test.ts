import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatGeoLabel,
  hasGeoData,
  isPrivateIp,
  lookupGeoFromIp,
  type ClientGeo,
} from "./client-geo";

describe("client geo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects private IPs", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.4")).toBe(true);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });

  it("formats geo labels", () => {
    expect(
      formatGeoLabel({ geo_city: "Minneapolis", geo_region: "MN", geo_country: "US" })
    ).toBe("Minneapolis, MN, US");
    expect(formatGeoLabel({})).toBe("—");
    expect(
      formatGeoLabel({
        geo_source: "browser",
        geo_city: "Edina",
        geo_region: "MN",
        geo_country: "US",
        geo_latitude: 44.88,
        geo_longitude: -93.22,
        geo_accuracy: 12,
      })
    ).toBe("Edina, MN, US · 44.88000, -93.22000 ±12m");
  });

  it("detects populated geo", () => {
    const empty: ClientGeo = {
      country: null,
      region: null,
      city: null,
      timezone: null,
      latitude: null,
      longitude: null,
      source: null,
    };
    expect(hasGeoData(empty)).toBe(false);
    expect(hasGeoData({ ...empty, city: "Saint Paul" })).toBe(true);
  });

  it("skips lookup for private IPs", async () => {
    const geo = await lookupGeoFromIp("127.0.0.1");
    expect(geo.source).toBeNull();
    expect(geo.city).toBeNull();
  });

  it("parses ip-api lookup responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "success",
          country: "United States",
          countryCode: "US",
          region: "MN",
          regionName: "Illinois",
          city: "Minneapolis",
          lat: 44.88,
          lon: -93.22,
          timezone: "America/Chicago",
        }),
      })
    );

    const geo = await lookupGeoFromIp("8.8.8.8");
    expect(geo).toEqual({
      country: "US",
      region: "Illinois",
      city: "Minneapolis",
      timezone: "America/Chicago",
      latitude: 44.88,
      longitude: -93.22,
      source: "ip_lookup",
    });
  });
});