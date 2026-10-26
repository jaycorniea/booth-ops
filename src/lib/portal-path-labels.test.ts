import { describe, expect, it } from "vitest";
import { buildSessionJourney, formatPortalPath } from "./portal-path-labels";

describe("formatPortalPath", () => {
  it("labels static routes", () => {
    expect(formatPortalPath("/on-call")).toBe("On-call pool");
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
      { path: "/on-call" },
      { path: "/on-call" },
      { path: "/day/2026-08-29/roster" },
    ]);
    expect(journey.breadcrumb).toBe("Home → On-call pool → Day (legacy roster) · Sat, Aug 29");
    expect(journey.truncated).toBe(false);
  });
});