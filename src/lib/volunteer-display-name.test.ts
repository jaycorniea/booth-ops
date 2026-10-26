import { describe, expect, it } from "vitest";
import {
  formatSchedulePersonName,
  formatVolunteerDisplayName,
  formatVolunteerLastInitial,
  showsFullScheduleLastName,
} from "./volunteer-display-name";

describe("formatVolunteerDisplayName", () => {
  it("keeps full first and last name", () => {
    expect(formatVolunteerDisplayName("Patricia Smith")).toBe("Patricia Smith");
  });

  it("returns single names unchanged", () => {
    expect(formatVolunteerDisplayName("Madonna")).toBe("Madonna");
  });

  it("keeps multi-word first names intact (not first-name + last-initial)", () => {
    // Regression: old formatter turned "Kathy Jo" into "Kathy J."
    expect(formatVolunteerDisplayName("Kathy Jo")).toBe("Kathy Jo");
    expect(formatVolunteerDisplayName("Mary Ann Smith")).toBe("Mary Ann Smith");
  });

  it("trims and collapses whitespace", () => {
    expect(formatVolunteerDisplayName("  Alex   Jones  ")).toBe("Alex Jones");
  });

  it("handles empty input", () => {
    expect(formatVolunteerDisplayName("   ")).toBe("");
  });
});

describe("formatVolunteerLastInitial", () => {
  it("shows first name plus last initial", () => {
    expect(formatVolunteerLastInitial("Patricia Smith")).toBe("Patricia S.");
  });

  it("keeps a single token unchanged", () => {
    expect(formatVolunteerLastInitial("Madonna")).toBe("Madonna");
  });

  it("uses the last token as the last name", () => {
    expect(formatVolunteerLastInitial("Mary Ann Smith")).toBe("Mary Ann S.");
  });

  it("handles empty input", () => {
    expect(formatVolunteerLastInitial("   ")).toBe("");
  });

  it("ignores a trailing parenthetical note", () => {
    expect(formatVolunteerLastInitial("Ed Hovelman (Spanish)")).toBe("Ed H.");
  });
});

describe("formatSchedulePersonName", () => {
  it("shows full last name to captains and admin", () => {
    expect(showsFullScheduleLastName("captain")).toBe(true);
    expect(showsFullScheduleLastName("admin")).toBe(true);
    expect(formatSchedulePersonName("Patricia Smith", "captain")).toBe("Patricia Smith");
    expect(formatSchedulePersonName("Patricia Smith", "admin")).toBe("Patricia Smith");
  });

  it("shows first name plus last initial to volunteers and viewers", () => {
    expect(showsFullScheduleLastName("volunteer")).toBe(false);
    expect(showsFullScheduleLastName("viewer")).toBe(false);
    expect(formatSchedulePersonName("Patricia Smith", "volunteer")).toBe("Patricia S.");
    expect(formatSchedulePersonName("Patricia Smith", "viewer")).toBe("Patricia S.");
  });
});
