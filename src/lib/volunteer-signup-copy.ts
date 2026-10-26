import { boothWhenWhereLines, getActiveEventSettings } from "./event-settings";
import { getBoothConfig } from "./booth-config";
import { getShiftSchedule } from "./event-dates";
import { officialSlotsPerShift } from "./shift-slots";

export function boothWhenWhere() {
  return {
    title: "When & where",
    lines: boothWhenWhereLines(getActiveEventSettings()),
  };
}

export const BOOTH_WHEN_WHERE = {
  title: "When & where",
  get lines() {
    return boothWhenWhereLines();
  },
};

export function shiftVolunteerRole() {
  const shifts = getShiftSchedule();
  const n = officialSlotsPerShift();
  const hours = shifts[0]
    ? `${shifts[0].start}–${shifts[shifts.length - 1]?.end}`
    : getActiveEventSettings().boothHours;
  return {
    title: "Scheduled shift volunteer",
    summary: `A booth shift on a specific event day. You greet visitors and staff the ${getActiveEventSettings().boothName}.`,
    bullets: [
      `${shifts.length} shifts per day (${hours}) — ${n} official volunteers each.`,
      "Arrive about 10 minutes early and check in with the day captain.",
      "The coordinator confirms your date and time.",
    ],
    signupCta: "Apply for a scheduled shift",
    signupPath: "/join-shift",
  };
}

export const SHIFT_VOLUNTEER_ROLE = {
  title: "Scheduled shift volunteer",
  get summary() {
    return shiftVolunteerRole().summary;
  },
  get bullets() {
    return shiftVolunteerRole().bullets;
  },
  signupCta: "Apply for a scheduled shift",
  signupPath: "/join-shift",
};

export const ON_CALL_ROLE = {
  title: "On-call backup volunteer",
  summary:
    "Not a scheduled shift — you are willing to be called same-day if a scheduled volunteer cancels or no-shows.",
  bullets: [
    "The day captain calls from this list when a slot opens.",
    "Typical ask: can you cover a booth shift today?",
    "The coordinator reviews your application before you appear in the active pool.",
  ],
  signupCta: "Join the on-call list",
  signupPath: "/join-on-call",
};

export const PARKING_ADMISSION = {
  title: "Arrival",
  get lines() {
    const settings = getActiveEventSettings();
    const eventName = getBoothConfig().event.name;
    return [
      `${eventName} booth location: ${settings.boothLocation}.`,
      `Booth hours: ${settings.boothHours}.`,
      "Your coordinator will send arrival details with your confirmation.",
    ];
  },
};

export const SIGNUP_PASSWORD_HELP =
  "The signup password is shown on this page under the password field.";

export const SIGNUP_SAVED_SHIFT =
  "Application received. The coordinator will review your preferences and confirm your shift.";

export const SIGNUP_SAVED_ON_CALL =
  "Application received. The coordinator will review it and add you to the active on-call pool once approved.";
