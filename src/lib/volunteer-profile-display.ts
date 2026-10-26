import { formatEventDate, formatShiftLabel } from "@/lib/event-dates";
import { ON_CALL_STATUS_LABELS } from "@/lib/on-call-status";
import {
  roleLabel,
  showsInterestedPlanningRole,
  volunteerProfileContactEditLinks,
  type VolunteerProfile,
  type VolunteerProfileEditLink,
  type VolunteerRole,
} from "@/lib/volunteer-profiles";

const ROLE_SHORT: Record<VolunteerRole, string> = {
  shift: "Shift",
  setup: "Setup",
  interested: "Interested",
  "on-call": "On-call",
  "day-captain": "Captain",
};

export function profileRolesCompact(roles: VolunteerRole[]): string {
  return roles.map((role) => ROLE_SHORT[role] ?? roleLabel(role)).join(" · ");
}

export function profileAssignmentsSummary(profile: VolunteerProfile): string {
  const parts: string[] = [];

  if (profile.shiftSlots.length === 1) {
    const slot = profile.shiftSlots[0];
    parts.push(`${formatEventDate(slot.event_date)} · ${formatShiftLabel(slot.shift_num)}`);
  } else if (profile.shiftSlots.length > 1) {
    parts.push(`${profile.shiftSlots.length} shifts`);
  }

  if (profile.captainDates.length > 0) {
    parts.push(
      `Captain ${profile.captainDates.map((d) => formatEventDate(d.event_date)).join(", ")}`
    );
  }

  if (
    profile.interestedStatus &&
    showsInterestedPlanningRole(
      profile.interestedStatus as "interested" | "placed" | "withdrawn"
    )
  ) {
    parts.push(`Interested: ${profile.interestedStatus}`);
  }

  if (profile.onCallStatus) {
    parts.push(ON_CALL_STATUS_LABELS[profile.onCallStatus]);
  }

  return parts.join(" · ") || "—";
}

export function profileAssignmentsTitle(profile: VolunteerProfile): string | undefined {
  const parts: string[] = [];

  if (profile.shiftSlots.length > 0) {
    parts.push(
      profile.shiftSlots
        .map((slot) => `${formatEventDate(slot.event_date)} · ${formatShiftLabel(slot.shift_num)}`)
        .join("; ")
    );
  }

  if (profile.captainDates.length > 0) {
    parts.push(
      `Day Captain: ${profile.captainDates.map((d) => formatEventDate(d.event_date)).join(", ")}`
    );
  }

  if (profile.availabilitySummary) {
    parts.push(profile.availabilitySummary);
  }

  if (profile.source) {
    parts.push(`Source: ${profile.source}`);
  }

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

const EDIT_LINK_SHORT: Record<string, string> = {
  "Interested roster": "Interested",
  "On-call pool": "On-call",
  "Day shifts": "Shifts",
  "Day Captain": "Captain",
};

export function profileEditLinkShortLabel(label: string): string {
  return EDIT_LINK_SHORT[label] ?? label;
}

export function profileEditLinksCompact(
  profile: Pick<
    VolunteerProfile,
    "onCallId" | "interestedId" | "shiftSlots" | "captainDates"
  >
): VolunteerProfileEditLink[] {
  return volunteerProfileContactEditLinks(profile).map((link) => ({
    ...link,
    label: profileEditLinkShortLabel(link.label),
  }));
}
