import { describe, expect, it } from "vitest";
import { centralLocalTimeToUtc } from "./portal-time";
import {
  captainDayContactStripMode,
  captainDayShowsCloseOut,
  isCaptainDayView,
} from "./captain-day-view";
import { getEventLiveWindowStartUtc } from "./portal-windows";

describe("captain-day-view", () => {
  it("detects captain role", () => {
    expect(isCaptainDayView("captain")).toBe(true);
    expect(isCaptainDayView("admin")).toBe(false);
    expect(isCaptainDayView(null)).toBe(false);
  });

  it("gates contact strip by portal window", () => {
    expect(captainDayContactStripMode(centralLocalTimeToUtc("2026-07-15", 12, 0, 0))).toBe("signup");
    expect(captainDayContactStripMode(centralLocalTimeToUtc("2026-05-15", 12, 0, 0))).toBe("hidden");
    expect(captainDayContactStripMode(getEventLiveWindowStartUtc())).toBe("no-show");
    expect(captainDayContactStripMode(centralLocalTimeToUtc("2026-08-20", 12, 0, 0))).toBe("hidden");
  });

  it("gates captain check-in to live window", () => {
    expect(captainDayShowsCloseOut("2026-08-14", centralLocalTimeToUtc("2026-07-15", 12, 0, 0))).toBe(
      false
    );
    expect(captainDayShowsCloseOut("2026-08-14", getEventLiveWindowStartUtc())).toBe(true);
    expect(captainDayShowsCloseOut("2026-08-01", getEventLiveWindowStartUtc())).toBe(false);
  });
});
