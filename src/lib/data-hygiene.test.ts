import { describe, expect, it } from "vitest";
import {
  activeVolunteerProfiles,
  hasCompleteContact,
  hasContactEmail,
  hasContactPhone,
  hasReachableContact,
  summarizeVolunteerContactHygiene,
} from "./data-hygiene";
import type { VolunteerProfile } from "./volunteer-profiles";

function profile(
  partial: Partial<VolunteerProfile> & Pick<VolunteerProfile, "key" | "name">
): VolunteerProfile {
  return {
    phone: "",
    email: "",
    roles: ["shift"],
    shiftSlots: [],
    captainDates: [] as VolunteerProfile["captainDates"],
    ...partial,
  };
}

describe("volunteer contact helpers", () => {
  it("detects trimmed phone and email", () => {
    expect(hasContactPhone({ phone: " 612-555-0100 " })).toBe(true);
    expect(hasContactPhone({ phone: "   " })).toBe(false);
    expect(hasContactEmail({ email: "a@example.com" })).toBe(true);
    expect(hasReachableContact({ phone: "", email: "a@example.com" })).toBe(true);
    expect(hasCompleteContact({ phone: "612", email: "" })).toBe(false);
    expect(hasCompleteContact({ phone: "612", email: "a@example.com" })).toBe(true);
  });
});

describe("activeVolunteerProfiles", () => {
  it("drops profiles with no roles", () => {
    const active = activeVolunteerProfiles([
      profile({ key: "a", name: "Alan", roles: ["shift"] }),
      profile({ key: "b", name: "Bob", roles: [] }),
    ]);
    expect(active).toHaveLength(1);
  });
});

describe("summarizeVolunteerContactHygiene", () => {
  it("computes contact coverage across active profiles", () => {
    const kpis = summarizeVolunteerContactHygiene([
      profile({ key: "a", name: "Alan", phone: "612", email: "a@example.com" }),
      profile({ key: "b", name: "Bob", phone: "651", email: "" }),
      profile({ key: "c", name: "Chris", phone: "", email: "c@example.com" }),
      profile({ key: "d", name: "Dana", phone: "", email: "" }),
      profile({ key: "e", name: "Empty", roles: [] }),
    ]);

    expect(kpis.totalVolunteers).toBe(4);
    expect(kpis.phone.filled).toBe(2);
    expect(kpis.phone.percent).toBe(50);
    expect(kpis.email.filled).toBe(2);
    expect(kpis.reachable.filled).toBe(3);
    expect(kpis.reachable.percent).toBe(75);
    expect(kpis.complete.filled).toBe(1);
    expect(kpis.complete.percent).toBe(25);
  });

  it("returns zero percents when no active volunteers", () => {
    const kpis = summarizeVolunteerContactHygiene([]);

    expect(kpis.totalVolunteers).toBe(0);
    expect(kpis.phone.percent).toBe(0);
    expect(kpis.email.percent).toBe(0);
    expect(kpis.reachable.percent).toBe(0);
    expect(kpis.complete.percent).toBe(0);
  });
});