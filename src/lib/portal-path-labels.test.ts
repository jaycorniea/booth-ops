import { describe, expect, it } from "vitest";
import { buildSessionJourney, formatPortalPath } from "./portal-path-labels";

describe("formatPortalPath", () => {
  it("labels static routes", () => {
    expect(formatPortalPath("/kpi")).toBe("KPIs");
    expect(formatPortalPath("/")).toBe("Home");
  });

  it("labels day subpages", () => {
    expect(formatPortalPath("/day/2026-08-29/roster")).toContain("legacy roster");
    expect(formatPortalPath("/day/2026-08-29")).toContain("Day");
  });
});

describe("buildSessionJourney", () => {
  it("collapses consecutive duplicate paths", () => {
    const journey = buildSessionJourney([
      { path: "/" },
      { path: "/kpi" },
      { path: "/kpi" },
      { path: "/day/2026-08-29/roster" },
    ]);
    expect(journey.breadcrumb).toBe("Home → KPIs → Day (legacy roster) · Sat, Aug 29");
    expect(journey.truncated).toBe(false);
  });
});