import { describe, expect, it } from "vitest";
import {
  fillPercent,
  fillPercentThresholds,
  fillPercentTone,
  fillSlotsAriaLabel,
  formatFillPercent,
  onCallBackupTone,
} from "./shift-fill";

describe("shift-fill", () => {
  it("computes percent from slot counts", () => {
    expect(fillPercent(3, 12)).toBe(25);
    expect(fillPercent(7, 12)).toBe(58);
    expect(fillPercent(11, 12)).toBe(92);
    expect(fillPercent(0, 0)).toBe(0);
  });

  it("maps percent to stoplight tone", () => {
    const tight = new Date("2026-08-22T17:00:00.000Z");
    expect(fillPercentTone(100, tight)).toBe("green");
    expect(fillPercentTone(99, tight)).toBe("green");
    expect(fillPercentTone(98, tight)).toBe("yellow");
    expect(fillPercentTone(95, tight)).toBe("yellow");
    expect(fillPercentTone(94.9, tight)).toBe("red");
  });

  it("uses 80/50 until the week before opening, then 99/95", () => {
    const july = new Date("2026-07-15T17:00:00.000Z");
    const dayBeforeTighten = new Date("2026-08-06T17:00:00.000Z");
    const tightenDay = new Date("2026-08-07T17:00:00.000Z");
    expect(fillPercentThresholds(july)).toEqual({ green: 80, yellow: 50 });
    expect(fillPercentTone(80, july)).toBe("green");
    expect(fillPercentTone(79, july)).toBe("yellow");
    expect(fillPercentTone(50, july)).toBe("yellow");
    expect(fillPercentTone(49, july)).toBe("red");
    expect(fillPercentThresholds(dayBeforeTighten)).toEqual({ green: 80, yellow: 50 });
    expect(fillPercentThresholds(tightenDay)).toEqual({ green: 99, yellow: 95 });
    expect(fillPercentTone(80, tightenDay)).toBe("red");
  });

  it("formats display percent", () => {
    expect(formatFillPercent(50)).toBe("50%");
    expect(formatFillPercent(16.7)).toBe("17%");
  });

  it("builds accessible slot-fill labels", () => {
    expect(fillSlotsAriaLabel(3, 12)).toBe("25% of volunteer slots filled (3 of 12)");
    expect(fillSlotsAriaLabel(6, 12, "for this day")).toBe(
      "50% of volunteer slots filled (6 of 12) for this day"
    );
    expect(fillSlotsAriaLabel(10, 12, "for this day", 2)).toBe(
      "83% of volunteer slots filled (10 of 12, plus 2 extra) for this day"
    );
  });

  it("maps on-call backup depth to stoplight tone", () => {
    expect(onCallBackupTone(0)).toBe("red");
    expect(onCallBackupTone(1)).toBe("yellow");
    expect(onCallBackupTone(2)).toBe("green");
  });
});