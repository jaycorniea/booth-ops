import { describe, expect, it } from "vitest";
import { centralLocalTimeToUtc } from "./portal-time";
import {
  effectivePortalWindow,
  parsePortalWindowSim,
  resolvePortalAsOf,
  sampleAsOfForPortalWindow,
} from "./portal-window-sim";
import { getPortalWindow } from "./portal-windows";

describe("portal-window-sim", () => {
  it("parses sim cookie values", () => {
    expect(parsePortalWindowSim("c")).toBe("c");
    expect(parsePortalWindowSim("live")).toBeNull();
    expect(parsePortalWindowSim(undefined)).toBeNull();
  });

  it("sample dates land in the intended windows", () => {
    expect(getPortalWindow(sampleAsOfForPortalWindow("a"))).toBe("a");
    expect(getPortalWindow(sampleAsOfForPortalWindow("b"))).toBe("b");
    expect(getPortalWindow(sampleAsOfForPortalWindow("c"))).toBe("c");
    expect(getPortalWindow(sampleAsOfForPortalWindow("d"))).toBe("d");
  });

  it("resolvePortalAsOf uses real clock when sim is null", () => {
    const real = centralLocalTimeToUtc("2026-07-05", 12, 0, 0);
    expect(resolvePortalAsOf(null, real)).toBe(real);
  });

  it("effectivePortalWindow prefers sim", () => {
    const real = centralLocalTimeToUtc("2026-07-05", 12, 0, 0);
    expect(effectivePortalWindow("c", real)).toBe("c");
    expect(effectivePortalWindow(null, real)).toBe("b");
  });
});
