import { describe, expect, it } from "vitest";
import { feedbackSubmitterLabel } from "./captain-feedback";

describe("feedbackSubmitterLabel", () => {
  it("returns Anonymous for blank names", () => {
    expect(feedbackSubmitterLabel("")).toBe("Anonymous");
    expect(feedbackSubmitterLabel("   ")).toBe("Anonymous");
    expect(feedbackSubmitterLabel(null)).toBe("Anonymous");
  });

  it("returns trimmed name", () => {
    expect(feedbackSubmitterLabel("  Alex  ")).toBe("Alex");
  });
});
