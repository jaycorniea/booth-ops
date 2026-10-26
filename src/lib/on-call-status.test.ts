import { describe, expect, it } from "vitest";
import {
  isOnCallVolunteerStatus,
  ON_CALL_ACTIVE_STATUSES,
  ON_CALL_STATUS_DESCRIPTIONS,
  ON_CALL_STATUS_LABELS,
  onCallStatusBadgeClass,
} from "./on-call-status";

describe("on-call-status", () => {
  it("recognizes valid statuses", () => {
    expect(isOnCallVolunteerStatus("new")).toBe(true);
    expect(isOnCallVolunteerStatus("approved")).toBe(true);
    expect(isOnCallVolunteerStatus("shift_requested")).toBe(true);
    expect(isOnCallVolunteerStatus("shift_assigned")).toBe(true);
    expect(isOnCallVolunteerStatus("withdrawn")).toBe(true);
    expect(isOnCallVolunteerStatus("pending")).toBe(false);
  });

  it("labels every status", () => {
    expect(ON_CALL_STATUS_LABELS.new).toBe("New application");
    expect(ON_CALL_STATUS_LABELS.shift_requested).toBe("Shift requested");
  });

  it("describes every status for the pool legend", () => {
    for (const status of Object.keys(ON_CALL_STATUS_LABELS) as (keyof typeof ON_CALL_STATUS_LABELS)[]) {
      expect(ON_CALL_STATUS_DESCRIPTIONS[status].length).toBeGreaterThan(10);
    }
  });

  it("defines active pool statuses", () => {
    expect(ON_CALL_ACTIVE_STATUSES).toEqual(["approved", "shift_requested"]);
  });

  it("returns badge classes for every status", () => {
    expect(onCallStatusBadgeClass("new")).toContain("amber");
    expect(onCallStatusBadgeClass("approved")).toContain("blue");
    expect(onCallStatusBadgeClass("shift_requested")).toContain("violet");
    expect(onCallStatusBadgeClass("shift_assigned")).toContain("green");
    expect(onCallStatusBadgeClass("withdrawn")).toContain("slate");
  });
});