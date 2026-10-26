import { describe, expect, it } from "vitest";
import { encodeAvailabilityFormValues } from "./availability-form";
import { parseInterestedVolunteerFormData } from "./interested-volunteer-form";

function form(entries: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, v);
    } else {
      fd.set(key, value);
    }
  }
  return fd;
}

describe("parseInterestedVolunteerFormData", () => {
  it("parses contact fields and formats display name", () => {
    const parsed = parseInterestedVolunteerFormData(
      form({
        name: "  Jamie Lee Smith  ",
        phone: "612-555-0100",
        email: "jamie@example.com",
        notes: "Prefers evenings",
        source: "demo booth",
        status: "interested",
      })
    );

    expect(parsed.name).toBe("Jamie Lee Smith");
    expect(parsed.phone).toBe("(612) 555-0100");
    expect(parsed.email).toBe("jamie@example.com");
    expect(parsed.notes).toBe("Prefers evenings");
    expect(parsed.source).toBe("demo booth");
    expect(parsed.status).toBe("interested");
    expect(parsed.bilingual).toBe(0);
    expect(parsed).not.toHaveProperty("REMOVED_ticket");
  });

  it("sets bilingual when checkbox is on", () => {
    const parsed = parseInterestedVolunteerFormData(
      form({ name: "Alex", bilingual: "on" })
    );
    expect(parsed.bilingual).toBe(1);
  });

  it("ignores REMOVED_ticket on interested forms", () => {
    const parsed = parseInterestedVolunteerFormData(
      form({ name: "Alex", REMOVED_ticket: "on" })
    );
    expect(parsed).not.toHaveProperty("REMOVED_ticket");
  });

  it("defaults missing fields to empty strings and interested status", () => {
    const parsed = parseInterestedVolunteerFormData(form({ name: "Solo" }));
    expect(parsed.phone).toBe("");
    expect(parsed.email).toBe("");
    expect(parsed.notes).toBe("");
    expect(parsed.source).toBe("");
    expect(parsed.status).toBe("interested");
    expect(parsed.available_dates).toBe("any");
    expect(parsed.available_shifts).toBe("any");
  });

  it("encodes specific availability days and shifts via shared helpers", () => {
    const parsed = parseInterestedVolunteerFormData(
      form({
        name: "Pat",
        available_dates: ["2026-08-27", "2026-08-29"],
        available_shifts: ["4", "5"],
      })
    );

    expect(parsed.available_dates).toBe("2026-08-27,2026-08-29");
    expect(parsed.available_shifts).toBe("4,5");
  });

  it("prefers specifics over any in mixed availability posts", () => {
    const parsed = parseInterestedVolunteerFormData(
      form({
        name: "Pat",
        available_dates: ["any", "2026-09-03"],
        available_shifts: ["any", "1"],
      })
    );

    expect(parsed.available_dates).toBe("2026-09-03");
    expect(parsed.available_shifts).toBe("1");
    expect(encodeAvailabilityFormValues(["any", "2026-09-03"])).toBe(parsed.available_dates);
  });

  it("keeps any when no specific days or shifts are posted", () => {
    const parsed = parseInterestedVolunteerFormData(
      form({
        name: "Pat",
        available_dates: ["any"],
        available_shifts: ["any"],
      })
    );

    expect(parsed.available_dates).toBe("any");
    expect(parsed.available_shifts).toBe("any");
  });

  it("treats empty availability arrays as any", () => {
    const parsed = parseInterestedVolunteerFormData(form({ name: "Pat" }));
    expect(parsed.available_dates).toBe("any");
    expect(parsed.available_shifts).toBe("any");
  });

  it("accepts placed and withdrawn status values", () => {
    const placed = parseInterestedVolunteerFormData(
      form({ name: "Pat", status: "placed" })
    );
    const withdrawn = parseInterestedVolunteerFormData(
      form({ name: "Pat", status: "withdrawn" })
    );

    expect(placed.status).toBe("placed");
    expect(withdrawn.status).toBe("withdrawn");
  });
});