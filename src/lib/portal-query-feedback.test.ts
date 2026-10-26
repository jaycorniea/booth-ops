import { describe, expect, it } from "vitest";
import {
  PORTAL_HOME_ERRORS,
  resolvePortalQueryMessage,
} from "./portal-query-feedback";

describe("resolvePortalQueryMessage", () => {
  it("returns null when code is missing", () => {
    expect(resolvePortalQueryMessage(undefined, PORTAL_HOME_ERRORS)).toBeNull();
  });

  it("resolves known home error codes", () => {
    expect(resolvePortalQueryMessage("admin_required", PORTAL_HOME_ERRORS)?.tone).toBe(
      "warning"
    );
    expect(resolvePortalQueryMessage("readonly", PORTAL_HOME_ERRORS)?.message).toContain(
      "View-only"
    );
  });

  it("falls back for unknown codes", () => {
    const msg = resolvePortalQueryMessage("unknown", PORTAL_HOME_ERRORS);
    expect(msg?.tone).toBe("error");
    expect(msg?.message).toContain("Something went wrong");
  });
});
