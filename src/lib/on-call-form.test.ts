import { describe, expect, it } from "vitest";
import {
  availabilitySelectionFromStorage,
  encodeAvailabilityFormValues,
  mergeAvailabilityToggle,
  parseOnCallFormData,
  splitAvailability,
} from "./on-call-form";

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

describe("availability selection helpers", () => {
  it("loads specific days when storage has them", () => {
    expect(availabilitySelectionFromStorage("2026-08-27,2026-08-29")).toEqual([
      "2026-08-27",
      "2026-08-29",
    ]);
  });

  it("drops any when specifics are also stored", () => {
    expect(availabilitySelectionFromStorage("any,2026-08-27")).toEqual(["2026-08-27"]);
  });

  it("unchecks any when a specific day is chosen", () => {
    const next = mergeAvailabilityToggle(new Set(["any"]), "2026-08-27");
    expect([...next]).toEqual(["2026-08-27"]);
  });

  it("prefers specifics over any in submitted form values", () => {
    expect(encodeAvailabilityFormValues(["any", "2026-08-27", "4"])).toBe("2026-08-27,4");
  });
});

describe("parseOnCallFormData", () => {
  it("parses volunteer fields and availability", () => {
    const form = new FormData();
    form.set("name", "  Pat Smith  ");
    form.set("phone", "612-555-1234");
    form.set("email", "pat@example.com");
    form.set("availability", "mornings only");
    form.set("notice_minutes", "30");
    form.append("available_dates", "2026-08-27");
    form.append("available_shifts", "1");
    form.set("bilingual", "on");

    const parsed = parseOnCallFormData(form);

    expect(parsed.name).toBe("Pat Smith");
    expect(parsed.phone).toBe("(612) 555-1234");
    expect(parsed.email).toBe("pat@example.com");
    expect(parsed.availability).toBe("mornings only");
    expect(parsed.notice_minutes).toBe(30);
    expect(parsed.available_dates).toBe("2026-08-27");
    expect(parsed.available_shifts).toBe("1");
    expect(parsed.bilingual).toBe(1);
  });

  it("prefers specific dates over any when both are posted", () => {
    const form = new FormData();
    form.set("name", "Sam");
    form.append("available_dates", "any");
    form.append("available_dates", "2026-08-27");
    form.append("available_shifts", "any");
    form.append("available_shifts", "4");

    const parsed = parseOnCallFormData(form);

    expect(parsed.available_dates).toBe("2026-08-27");
    expect(parsed.available_shifts).toBe("4");
  });

  it("defaults to any availability and minimum notice", () => {
    const form = new FormData();
    form.set("name", "Sam");
    form.set("notice_minutes", "2");

    const parsed = parseOnCallFormData(form);

    expect(parsed.available_dates).toBe("any");
    expect(parsed.available_shifts).toBe("any");
    expect(parsed.notice_minutes).toBe(5);
    expect(parsed.bilingual).toBe(0);
  });
});