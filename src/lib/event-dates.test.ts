import { describe, expect, it } from "vitest";
import {
  daysUntilEventOpen,
  eventDayNumber,
  formatEventDate,
  formatEventDayCard,
  formatIsoDate,
  formatShiftLabel,
  formatShiftOption,
  getEventDates,
  getEventPhase,
  hasDayCaptain,
  hasVolunteer,
  isEventDate,
  reorderForColumnMajorGrid,
} from "./event-dates";

describe("event-dates", () => {
  it("lists demo event dates", () => {
    const dates = getEventDates();
    expect(dates[0]).toBe("2026-08-14");
    expect(dates.at(-1)).toBe("2026-08-16");
    expect(dates).toHaveLength(3);
  });

  it("reorders checkbox options down columns", () => {
    const dates = getEventDates();
    const ordered = reorderForColumnMajorGrid(dates);
    expect(ordered).toHaveLength(3);
  });

  it("formats dates for display", () => {
    expect(formatIsoDate("2026-08-14")).toBe("08-14-2026");
    expect(formatEventDate("2026-08-14")).toContain("Aug");
    expect(formatEventDayCard("2026-08-14")).toContain("AUG");
  });

  it("formats shift options from config", () => {
    expect(formatShiftOption(1)).toContain("Shift 1");
    expect(formatShiftLabel(1)).toMatch(/^1\./);
  });

  it("detects assigned captain and volunteers", () => {
    expect(hasDayCaptain({ name: " Pat " })).toBe(true);
    expect(hasDayCaptain({ name: " " })).toBe(false);
    expect(hasVolunteer("Alex")).toBe(true);
    expect(isEventDate("2026-08-14")).toBe(true);
    expect(isEventDate("2026-01-01")).toBe(false);
    expect(getEventPhase("2026-08-14")).toBe("during-event");
    expect(daysUntilEventOpen("2026-08-14")).toBe(0);
    expect(eventDayNumber("2026-08-15")).toBe(2);
  });
});
