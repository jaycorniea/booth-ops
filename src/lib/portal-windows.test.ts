import { describe, expect, it } from "vitest";
import { localTimeToUtc } from "./portal-time";
import {
  captainCanUseDayTools,
  getEventLiveWindowEndUtc,
  getEventLiveWindowStartUtc,
  getPortalWindow,
  getWindowBStartUtc,
  isCaptainLockedOut,
  isEventLiveWindow,
  isSignupVolunteersWindow,
  PORTAL_WINDOW_META,
} from "./portal-windows";

describe("portal-windows", () => {
  it("exposes plain captain labels", () => {
    expect(PORTAL_WINDOW_META.a.label).toBe("Before captain tools open");
    expect(PORTAL_WINDOW_META.b.label).toBe("Fill the schedule");
    expect(PORTAL_WINDOW_META.c.label).toBe("Booth is live");
    expect(PORTAL_WINDOW_META.d.label).toBe("Event closed");
  });

  it("Window A before captain tools open", () => {
    expect(getPortalWindow(localTimeToUtc("2026-05-31", 23, 59, 59))).toBe("a");
    expect(captainCanUseDayTools(localTimeToUtc("2026-05-31", 12, 0, 0))).toBe(false);
  });

  it("Window B from tools open until live start", () => {
    expect(getPortalWindow(getWindowBStartUtc())).toBe("b");
    expect(getPortalWindow(localTimeToUtc("2026-07-15", 12, 0, 0))).toBe("b");
    expect(isSignupVolunteersWindow(localTimeToUtc("2026-07-15", 9, 0, 0))).toBe(true);
    expect(isEventLiveWindow(localTimeToUtc("2026-07-15", 9, 0, 0))).toBe(false);
  });

  it("Window C from live start until live end", () => {
    expect(getPortalWindow(getEventLiveWindowStartUtc())).toBe("c");
    expect(getPortalWindow(localTimeToUtc("2026-08-15", 10, 0, 0))).toBe("c");
    expect(isEventLiveWindow(getEventLiveWindowStartUtc())).toBe(true);
  });

  it("Window D after live end", () => {
    expect(getPortalWindow(getEventLiveWindowEndUtc())).toBe("d");
    expect(isCaptainLockedOut(getEventLiveWindowEndUtc())).toBe(true);
    expect(captainCanUseDayTools(getEventLiveWindowEndUtc())).toBe(false);
  });
});
