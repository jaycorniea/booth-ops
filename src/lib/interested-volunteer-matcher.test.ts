import { describe, expect, it } from "vitest";
import { mockInterestedVolunteer } from "@/test/fixtures";
import { recommendInterestedVolunteers } from "./interested-volunteer-matcher";

describe("recommendInterestedVolunteers", () => {
  const request = { eventDate: "2026-09-03", shiftNum: 1 };

  it("only includes interested volunteers", () => {
    const results = recommendInterestedVolunteers(
      [
        mockInterestedVolunteer({ id: 1, status: "placed", name: "Placed" }),
        mockInterestedVolunteer({ id: 2, status: "interested", name: "Open" }),
      ],
      request
    );

    expect(results).toHaveLength(1);
    expect(results[0].volunteer.name).toBe("Open");
  });

  it("prefers exact date and shift matches", () => {
    const results = recommendInterestedVolunteers(
      [
        mockInterestedVolunteer({
          id: 1,
          name: "Any",
          available_dates: "any",
          available_shifts: "any",
        }),
        mockInterestedVolunteer({
          id: 2,
          name: "Exact",
          available_dates: "2026-09-03",
          available_shifts: "1",
        }),
      ],
      request
    );

    expect(results[0].volunteer.name).toBe("Exact");
    expect(results[0].tier).toBe("recommended");
  });
});