import { describe, expect, it } from "vitest";
import { formatPortalDateSubmitted, formatPortalTimestampCompact } from "./portal-time";

describe("formatPortalTimestampCompact", () => {
  it("formats sqlite UTC in compact Central form", () => {
    const formatted = formatPortalTimestampCompact("2026-06-22 20:45:00");
    expect(formatted).toMatch(/Jun 22/);
    expect(formatted).toMatch(/45/);
  });

  it("returns dash for empty input", () => {
    expect(formatPortalTimestampCompact(null)).toBe("—");
  });
});

describe("formatPortalDateSubmitted", () => {
  it("formats sqlite UTC as Central date", () => {
    const formatted = formatPortalDateSubmitted("2026-06-25 18:30:00");
    expect(formatted).toMatch(/Jun 25, 2026/);
  });

  it("returns dash for empty input", () => {
    expect(formatPortalDateSubmitted(null)).toBe("—");
  });
});