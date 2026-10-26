import { describe, expect, it } from "vitest";
import {
  availabilitySelectionFromStorage,
  encodeAvailabilityFormValues,
  mergeAvailabilityToggle,
  splitAvailability,
} from "./availability-form";
import { parseInterestedVolunteerFormData } from "./interested-volunteer-form";
import { parseOnCallFormData } from "./on-call-form";

describe("splitAvailability", () => {
  it("treats empty and any as any", () => {
    expect(splitAvailability("")).toEqual(["any"]);
    expect(splitAvailability("any")).toEqual(["any"]);
  });

  it("splits comma-separated values", () => {
    expect(splitAvailability("2026-08-27,2026-08-28")).toEqual([
      "2026-08-27",
      "2026-08-28",
    ]);
  });
});

describe("availabilitySelectionFromStorage", () => {
  it("loads specific days when storage has them", () => {
    expect(availabilitySelectionFromStorage("2026-08-27,2026-08-29")).toEqual([
      "2026-08-27",
      "2026-08-29",
    ]);
  });

  it("drops any when specifics are also stored", () => {
    expect(availabilitySelectionFromStorage("any,2026-08-27")).toEqual(["2026-08-27"]);
  });

  it("returns any for bare any storage", () => {
    expect(availabilitySelectionFromStorage("any")).toEqual(["any"]);
  });
});

describe("mergeAvailabilityToggle", () => {
  it("unchecks any when a specific day is chosen", () => {
    const next = mergeAvailabilityToggle(new Set(["any"]), "2026-08-27");
    expect([...next]).toEqual(["2026-08-27"]);
  });

  it("resets to any when all specifics are cleared", () => {
    const next = mergeAvailabilityToggle(new Set(["2026-08-27"]), "2026-08-27");
    expect([...next]).toEqual(["any"]);
  });

  it("selecting any clears specifics", () => {
    const next = mergeAvailabilityToggle(new Set(["2026-08-27", "4"]), "any");
    expect([...next]).toEqual(["any"]);
  });
});

describe("encodeAvailabilityFormValues", () => {
  it("prefers specifics over any in submitted form values", () => {
    expect(encodeAvailabilityFormValues(["any", "2026-08-27", "4"])).toBe("2026-08-27,4");
  });

  it("keeps any when it is the only value", () => {
    expect(encodeAvailabilityFormValues(["any"])).toBe("any");
    expect(encodeAvailabilityFormValues([])).toBe("any");
  });
});

describe("shared form roundtrips", () => {
  it("parseOnCallFormData encodes hidden-input style availability posts", () => {
    const form = new FormData();
    form.set("name", "Pat");
    form.append("available_dates", "2026-08-27");
    form.append("available_dates", "2026-08-29");
    form.append("available_shifts", "4");
    form.append("available_shifts", "5");

    const parsed = parseOnCallFormData(form);

    expect(parsed.available_dates).toBe("2026-08-27,2026-08-29");
    expect(parsed.available_shifts).toBe("4,5");
  });

  it("parseInterestedVolunteerFormData uses the same encode rules as on-call", () => {
    const form = new FormData();
    form.set("name", "Jamie");
    form.append("available_dates", "any");
    form.append("available_dates", "2026-09-03");
    form.append("available_shifts", "any");
    form.append("available_shifts", "1");

    const parsed = parseInterestedVolunteerFormData(form);

    expect(parsed.available_dates).toBe("2026-09-03");
    expect(parsed.available_shifts).toBe("1");
  });
});