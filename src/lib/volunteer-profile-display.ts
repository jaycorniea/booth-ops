import { formatEventDate, formatShiftLabel } from "@/lib/event-dates";
import {
  roleLabel,
  volunteerProfileContactEditLinks,
  type VolunteerProfile,
  type VolunteerProfileEditLink,
  type VolunteerRole,
} from "@/lib/volunteer-profiles";

const ROLE_SHORT: Record<VolunteerRole, string> = {
  shift: "Shift",
  setup: "Setup",
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

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

const EDIT_LINK_SHORT: Record<string, string> = {
  "Day shifts": "Shifts",
  "Day Captain": "Captain",
};

export function profileEditLinkShortLabel(label: string): string {
  return EDIT_LINK_SHORT[label] ?? label;
}

export function profileEditLinksCompact(
  profile: Pick<VolunteerProfile, "shiftSlots" | "captainDates">
): VolunteerProfileEditLink[] {
  return volunteerProfileContactEditLinks(profile).map((link) => ({
    ...link,
    label: profileEditLinkShortLabel(link.label),
  }));
}
