import { formatEventDate, getShiftSchedule } from "./event-dates";
import type { InterestedVolunteer } from "./db";
import { splitAvailability } from "./on-call-form";

export interface InterestedVolunteerRecommendation {
  volunteer: InterestedVolunteer;
  score: number;
  tier: "recommended" | "possible";
  reasons: string[];
}

export interface InterestedVolunteerMatchRequest {
  eventDate: string;
  shiftNum: number;
}

function matchesDate(availableDates: string, eventDate: string): boolean {
  const list = splitAvailability(availableDates);
  return list.includes("any") || list.includes(eventDate);
}

function matchesShift(availableShifts: string, shiftNum: number): boolean {
  const list = splitAvailability(availableShifts);
  return list.includes("any") || list.includes(String(shiftNum));
}

export function recommendInterestedVolunteers(
  volunteers: InterestedVolunteer[],
  request: InterestedVolunteerMatchRequest
): InterestedVolunteerRecommendation[] {
  const { eventDate, shiftNum } = request;
  const sched = getShiftSchedule().find((s) => s.num === shiftNum);
  const spanishPriority = sched && "spanishPriority" in sched && sched.spanishPriority;
  const results: InterestedVolunteerRecommendation[] = [];

  for (const volunteer of volunteers) {
    if (volunteer.status !== "interested") continue;

    const dateOk = matchesDate(volunteer.available_dates, eventDate);
    const shiftOk = matchesShift(volunteer.available_shifts, shiftNum);
    if (!dateOk || !shiftOk) continue;

    const reasons: string[] = [];
    let score = 0;
    const dates = splitAvailability(volunteer.available_dates);
    const shifts = splitAvailability(volunteer.available_shifts);

    if (dates.includes(eventDate)) {
      score += 50;
      reasons.push(`Requested ${formatEventDate(eventDate)}`);
    } else if (dates.includes("any")) {
      score += 20;
      reasons.push("Flexible on event days");
    }

    if (shifts.includes(String(shiftNum))) {
      score += 50;
      reasons.push(`Listed for shift ${shiftNum}${sched ? ` (${sched.label})` : ""}`);
    } else if (shifts.includes("any")) {
      score += 20;
      reasons.push("Flexible on shift times");
    }

    if (volunteer.bilingual === 1) {
      reasons.push("Spanish speaker");
      if (spanishPriority) {
        score += 20;
        reasons.push("Spanish priority shift");
      }
    }

    if (volunteer.phone) score += 10;
    else {
      score -= 15;
      reasons.push("No phone on file");
    }

    if (volunteer.notes) reasons.push(volunteer.notes);
    if (volunteer.source) reasons.push(`Source: ${volunteer.source}`);

    const tier: InterestedVolunteerRecommendation["tier"] =
      dates.includes(eventDate) && shifts.includes(String(shiftNum)) ? "recommended" : "possible";

    results.push({ volunteer, score, tier, reasons });
  }

  return results.sort(
    (a, b) => b.score - a.score || a.volunteer.name.localeCompare(b.volunteer.name)
  );
}