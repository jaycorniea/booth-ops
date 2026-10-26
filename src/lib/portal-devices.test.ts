import { describe, expect, it } from "vitest";
import { adminCaptainIpNotes, guestIpNotes } from "./captain-ip-mapping-keys";
import {
  formatPortalDeviceTelemetry,
  ipHasConfirmedDevice,
  isConfirmedPortalDevice,
  resolvePortalLogNameFromDevice,
} from "./portal-devices";

describe("portal-devices", () => {
  it("detects confirmed devices", () => {
    expect(isConfirmedPortalDevice({ source: "admin", notes: "Alex" })).toBe(true);
    expect(isConfirmedPortalDevice({ source: "admin", notes: "" })).toBe(false);
    expect(isConfirmedPortalDevice({ source: null, notes: "Alex" })).toBe(false);
  });

  it("resolves portal log names from devices", () => {
    const adminDevice = {
      source: "admin" as const,
      notes: adminCaptainIpNotes("Alex Rivera"),
    };
    const guestDevice = {
      source: "admin" as const,
      notes: guestIpNotes("Pat"),
    };

    expect(resolvePortalLogNameFromDevice(adminDevice, null)).toBeNull();
    expect(resolvePortalLogNameFromDevice(adminDevice, "admin")).toBe("Alex Rivera (admin)");
    expect(resolvePortalLogNameFromDevice(guestDevice, null)).toBe("Pat");
    expect(
      resolvePortalLogNameFromDevice({ source: "admin", notes: "Sam Patel" }, null)
    ).toBe("Sam Patel");
  });

  it("checks confirmed device registry", () => {
    const devices = [{ client_ip: "10.0.0.1", source: "admin" as const, notes: "Alex" }];
    expect(ipHasConfirmedDevice(devices, "10.0.0.1")).toBe(true);
    expect(ipHasConfirmedDevice(devices, "10.0.0.2")).toBe(false);
  });

  it("formats device telemetry for admin tables", () => {
    expect(
      formatPortalDeviceTelemetry({
        browser: "Chrome",
        browser_version: "120",
        platform: "iPhone",
        is_mobile: 1,
        user_agent: null,
      })
    ).toBe("Chrome 120 · iPhone · Mobile");
    expect(formatPortalDeviceTelemetry(null)).toBe("—");
  });
});
