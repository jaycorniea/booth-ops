import { describe, expect, it } from "vitest";
import { sumShiftClickers } from "./day-log";

describe("sumShiftClickers", () => {
  it("returns null when nothing is logged", () => {
    expect(sumShiftClickers([{ clicker_count: null }, {}])).toBeNull();
  });

  it("sums logged shifts only", () => {
    expect(
      sumShiftClickers([{ clicker_count: 12 }, { clicker_count: null }, { clicker_count: 4 }])
    ).toBe(16);
  });
});
