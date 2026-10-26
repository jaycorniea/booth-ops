import { describe, expect, it } from "vitest";
import { portalContactFooterExcluded } from "./portal-contact-footer";

describe("portalContactFooterExcluded", () => {
  it("excludes resources page", () => {
    expect(portalContactFooterExcluded("/resources")).toBe(true);
  });

  it("includes other portal pages", () => {
    expect(portalContactFooterExcluded("/")).toBe(false);
    expect(portalContactFooterExcluded("/schedule")).toBe(false);
    expect(portalContactFooterExcluded("/day/2026-08-28")).toBe(false);
    expect(portalContactFooterExcluded("/feedback")).toBe(false);
  });
});
