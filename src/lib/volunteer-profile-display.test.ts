import { describe, expect, it } from "vitest";
import {
  profileAssignmentsSummary,
  profileEditLinkShortLabel,
  profileRolesCompact,
} from "./volunteer-profile-display";
import type { VolunteerProfile } from "./volunteer-profiles";

function sampleProfile(overrides: Partial<VolunteerProfile> = {}): VolunteerProfile {
  return {
    key: "phone:555",
    name: "Alex Example",
    phone: "5551234567",
    email: "alex@example.com",
    roles: ["shift"],
    shiftSlots: [{ event_date: "2026-08-27", shift_num: 1, slot: "vol1" }],
    interestedId: null,
    onCallId: null,
    interestedStatus: null,
    onCallStatus: null,
    captainDates: [],
    availabilitySummary: "",
    source: "",
    ...overrides,
  };
}

describe("volunteer-profile-display", () => {
  it("compact roles join with middle dots", () => {
    expect(profileRolesCompact(["shift", "on-call"])).toBe("Shift · On-call");
  });

  it("summarizes single shift and captain dates", () => {
    expect(
      profileAssignmentsSummary(
        sampleProfile({
          captainDates: [{ event_date: "2026-08-28", captain_slot: "full" }],
        })
      )
    ).toContain("Fri, Aug 28");
    expect(
      profileAssignmentsSummary(
        sampleProfile({
          shiftSlots: [
            { event_date: "2026-08-27", shift_num: 1, slot: "vol1" },
            { event_date: "2026-08-28", shift_num: 2, slot: "vol2" },
          ],
        })
      )
    ).toBe("2 shifts");
  });

  it("shortens edit link labels for the glance table", () => {
    expect(profileEditLinkShortLabel("Interested roster")).toBe("Interested");
    expect(profileEditLinkShortLabel("Day shifts")).toBe("Shifts");
  });
});
