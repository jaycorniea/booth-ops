import { describe, expect, it } from "vitest";
import { CANONICAL_PORTAL_URL, portalBaseUrl } from "./portal-url";

describe("portal-url", () => {
  it("defaults to local demo URL", () => {
    expect(CANONICAL_PORTAL_URL).toBe("http://127.0.0.1:3010");
    expect(portalBaseUrl("https://example.org/")).toBe("https://example.org");
  });
});
