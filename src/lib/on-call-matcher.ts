import { formatEventDate, getEventDates, getShiftSchedule } from "./event-dates";
import type { OnCallVolunteer } from "./db";
import {
  hasPendingOnCallShiftRequest,
  pendingOnCallShiftRequestContactedAt,
} from "./on-call-shift-requests";
import { ON_CALL_ACTIVE_STATUSES, ON_CALL_COVERAGE_STATUSES } from "./on-call-status";

export interface OnCallRecommendation {
  volunteer: OnCallVolunteer;
  score: number;
  tier: "recommended" | "possible";
  reasons: string[];
}

export interface OnCallMatchRequest {
  eventDate: string;
  shiftNum: number;
}

function parseList(value: string): string[] {
  if (!value || value.trim().toLowerCase() === "any") return ["any"];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function onCallMatchesDate(availableDates: string, eventDate: string): boolean {
  const list = parseList(availableDates);
  return list.includes("any") || list.includes(eventDate);
}

export function onCallMatchesShift(availableShifts: string, shiftNum: number): boolean {
  const list = parseList(availableShifts);
  return list.includes("any") || list.includes(String(shiftNum));
}

export function onCallVolunteerMatchesSlot(
  volunteer: Pick<OnCallVolunteer, "available_dates" | "available_shifts" | "status">,
  eventDate: string,
  shiftNum: number
): boolean {
  if (!ON_CALL_ACTIVE_STATUSES.includes(volunteer.status)) return false;
  return (
    onCallMatchesDate(volunteer.available_dates, eventDate) &&
    onCallMatchesShift(volunteer.available_shifts, shiftNum)
  );
}

export function onCallVolunteerCoversSlot(
  volunteer: Pick<OnCallVolunteer, "available_dates" | "available_shifts" | "status">,
  eventDate: string,
  shiftNum: number
): boolean {
  if (!ON_CALL_COVERAGE_STATUSES.includes(volunteer.status)) return false;
  return (
    onCallMatchesDate(volunteer.available_dates, eventDate) &&
    onCallMatchesShift(volunteer.available_shifts, shiftNum)
  );
}

export function onCallCoverageKey(eventDate: string, shiftNum: number): string {
  return `${eventDate}|${shiftNum}`;
}

export interface OnCallCoverageMatrix {
  eventDates: string[];
  shifts: ReturnType<typeof getShiftSchedule>[number][];
  counts: Record<string, number>;
}

export function buildOnCallCoverageMatrix(volunteers: OnCallVolunteer[]): OnCallCoverageMatrix {
  const eventDates = getEventDates();
  const shifts = [...getShiftSchedule()];
  const counts: Record<string, number> = {};

  for (const eventDate of eventDates) {
    for (const shift of shifts) {
      const key = onCallCoverageKey(eventDate, shift.num);
      counts[key] = volunteers.filter((volunteer) =>
        onCallVolunteerCoversSlot(volunteer, eventDate, shift.num)
      ).length;
    }
  }

  return { eventDates, shifts, counts };
}

export interface OnCallCoverageSummary {
  total: number;
  withTwoOrMore: number;
  withOne: number;
  withZero: number;
}

/** Bucket each event-day × shift slot by how many active-pool on-call volunteers cover it. */
export function summarizeOnCallCoverage(matrix: OnCallCoverageMatrix): OnCallCoverageSummary {
  let withTwoOrMore = 0;
  let withOne = 0;
  let withZero = 0;

  for (const eventDate of matrix.eventDates) {
    for (const shift of matrix.shifts) {
      const count = matrix.counts[onCallCoverageKey(eventDate, shift.num)] ?? 0;
      if (count >= 2) withTwoOrMore++;
      else if (count === 1) withOne++;
      else withZero++;
    }
  }

  return {
    total: matrix.eventDates.length * matrix.shifts.length,
    withTwoOrMore,
    withOne,
    withZero,
  };
}

export function matrixShiftRowLabel(sched: ReturnType<typeof getShiftSchedule>[number]): string {
  const hour = (time: string) => String(Number(time.split(":")[0]));
  return `${hour(sched.start)}–${hour(sched.end)}`;
}

/** Compact M/D label for coverage matrix column headers. */
export function matrixEventDateLabel(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  return `${Number(match[2])}/${Number(match[3])}`;
}

function formatAvailabilitySummary(v: OnCallVolunteer): string {
  const dates = parseList(v.available_dates);
  const shifts = parseList(v.available_shifts);
  const dateLabel =
    dates.includes("any") || !v.available_dates
      ? "any event day"
      : dates.map((d) => formatEventDate(d)).join(", ");
  const shiftLabel =
    shifts.includes("any") || !v.available_shifts
      ? "any shift"
      : shifts
          .map((s) => {
            const sched = getShiftSchedule().find((x) => x.num === Number(s));
            return sched ? `shift ${s} (${sched.label})` : `shift ${s}`;
          })
          .join(", ");
  return `${dateLabel} · ${shiftLabel}`;
}

function hoursSince(iso: string): number | null {
  if (!iso) return null;
  const t = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`).getTime();
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / (1000 * 60 * 60);
}

export function recommendOnCallVolunteers(
  volunteers: OnCallVolunteer[],
  request: OnCallMatchRequest
): OnCallRecommendation[] {
  const { eventDate, shiftNum } = request;
  const sched = getShiftSchedule().find((s) => s.num === shiftNum);
  const spanishPriority = sched && "spanishPriority" in sched && sched.spanishPriority;
  const results: OnCallRecommendation[] = [];

  for (const volunteer of volunteers) {
    if (!ON_CALL_ACTIVE_STATUSES.includes(volunteer.status)) continue;

    const dateOk = onCallMatchesDate(volunteer.available_dates, eventDate);
    const shiftOk = onCallMatchesShift(volunteer.available_shifts, shiftNum);
    if (!dateOk || !shiftOk) continue;

    const reasons: string[] = [];
    let score = 0;

    const dates = parseList(volunteer.available_dates);
    const shifts = parseList(volunteer.available_shifts);

    if (dates.includes(eventDate)) {
      score += 40;
      reasons.push(`Available ${formatEventDate(eventDate)}`);
    } else if (dates.includes("any")) {
      score += 15;
      reasons.push("Available any event day");
    }

    if (shifts.includes(String(shiftNum))) {
      score += 40;
      reasons.push(`Listed for shift ${shiftNum}${sched ? ` (${sched.label})` : ""}`);
    } else if (shifts.includes("any")) {
      score += 15;
      reasons.push("Available any shift");
    }

    const notice = volunteer.notice_minutes ?? 45;
    score += Math.max(0, 50 - notice);
    reasons.push(`~${notice} min to reach the venue`);

    if (volunteer.bilingual === 1) {
      reasons.push("Spanish speaker");
      if (spanishPriority) {
        score += 25;
        reasons.push("Spanish priority shift");
      }
    } else if (spanishPriority) {
      score -= 10;
    }

    if (volunteer.phone) {
      score += 8;
    } else {
      score -= 20;
      reasons.push("No phone on file");
    }

    const pending = volunteer.pending_shift_requests ?? [];
    if (hasPendingOnCallShiftRequest(pending, eventDate, shiftNum)) {
      reasons.push("Outreach already logged for this shift");
      score -= 5;
    }

    const shiftContactedAt =
      pendingOnCallShiftRequestContactedAt(pending, eventDate, shiftNum) ??
      volunteer.last_contacted;
    const hours = hoursSince(shiftContactedAt);
    if (hours !== null && hours < 2) {
      score -= 25;
      reasons.push("Contacted for this shift in last 2 hours");
    } else if (hours !== null && hours < 24) {
      score -= 8;
      reasons.push("Contacted for this shift today");
    }

    if (volunteer.availability) {
      reasons.push(volunteer.availability);
    }

    const tier: OnCallRecommendation["tier"] =
      dates.includes(eventDate) && shifts.includes(String(shiftNum)) ? "recommended" : "possible";

    results.push({ volunteer, score, tier, reasons, });
  }

  return results
    .sort((a, b) => b.score - a.score || a.volunteer.name.localeCompare(b.volunteer.name))
    .map((r) => ({
      ...r,
      reasons: r.reasons.length ? r.reasons : [formatAvailabilitySummary(r.volunteer)],
    }));
}