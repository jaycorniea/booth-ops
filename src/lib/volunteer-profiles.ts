import { type CaptainSlot, isSplitCaptainDay } from "./day-captain-slots";
import { dayDashboardHref } from "./day-routes";
import {
  formatEventDate,
  getEventDates,
  getShiftSchedule,
} from "./event-dates";
import {
  getDayCaptains,
  getShiftsForDate,
  listInterestedVolunteers,
  listOnCall,
  type InterestedVolunteerStatus,
} from "./db";
import { ON_CALL_STATUS_LABELS, type OnCallVolunteerStatus } from "./on-call-status";
import { splitAvailability } from "./on-call-form";

export type VolunteerRole = "shift" | "setup" | "interested" | "on-call" | "day-captain";

export interface VolunteerCaptainAssignment {
  event_date: string;
  captain_slot: CaptainSlot;
}

export type VolunteerShiftSlot = {
  event_date: string;
  shift_num: number;
  slot: string;
};

export interface VolunteerProfile {
  key: string;
  name: string;
  phone: string;
  email: string;
  roles: VolunteerRole[];
  shiftSlots: VolunteerShiftSlot[];
  interestedId: number | null;
  onCallId: number | null;
  interestedStatus: string | null;
  onCallStatus: OnCallVolunteerStatus | null;
  captainDates: VolunteerCaptainAssignment[];
  availabilitySummary: string;
  source: string;
}

function normPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function normName(name: string): string {
  return name.trim().toLowerCase();
}

export function volunteerContactKey(name: string, phone: string, email: string): string {
  const phoneKey = normPhone(phone);
  if (phoneKey) return `phone:${phoneKey}`;
  const emailKey = email.trim().toLowerCase();
  if (emailKey) return `email:${emailKey}`;
  return `name:${normName(name)}`;
}

function profileKey(name: string, phone: string, email: string): string {
  return volunteerContactKey(name, phone, email);
}

/** Placed interested pool → day sheet, even if the shift row lost the name. */
export function placedInterestedShiftSlot(volunteer: {
  status: string;
  placed_event_date?: string | null;
  placed_shift_num?: number | null;
}): VolunteerShiftSlot | null {
  if (volunteer.status !== "placed") return null;
  const date = volunteer.placed_event_date?.trim() ?? "";
  const shiftNum = volunteer.placed_shift_num;
  if (!date || shiftNum == null || !Number.isFinite(shiftNum) || shiftNum < 1) return null;
  return { event_date: date, shift_num: shiftNum, slot: "slot_1" };
}

export function mergeShiftSlots(
  existing: VolunteerShiftSlot[],
  added: VolunteerShiftSlot[]
): VolunteerShiftSlot[] {
  const out = [...existing];
  for (const slot of added) {
    if (!out.some((row) => row.event_date === slot.event_date && row.shift_num === slot.shift_num)) {
      out.push(slot);
    }
  }
  return out;
}

function summarizeAvailability(
  availableDates: string,
  availableShifts: string,
  extra?: string
): string {
  const dates = splitAvailability(availableDates);
  const shifts = splitAvailability(availableShifts);
  const dateLabel = dates.includes("any")
    ? "Any event day"
    : dates.map((d) => formatEventDate(d)).join(", ");
  const shiftLabel = shifts.includes("any")
    ? "Any shift"
    : shifts
        .map((s) => getShiftSchedule().find((x) => x.num === Number(s))?.label ?? s)
        .join(", ");
  const extraLabel = extra?.trim() ? ` · ${extra.trim()}` : "";
  return `${dateLabel} · ${shiftLabel}${extraLabel}`;
}

export async function listVolunteerProfiles(): Promise<VolunteerProfile[]> {
  const scheduleDates = getEventDates();
  const [shiftGroups, interested, onCall] = await Promise.all([
    Promise.all(scheduleDates.map((d) => getShiftsForDate(d))),
    listInterestedVolunteers(),
    listOnCall(),
  ]);
  const shifts = shiftGroups.flat();

  const captains = (await Promise.all(getEventDates().map((d) => getDayCaptains(d)))).flat();
  const map = new Map<string, VolunteerProfile>();

  function upsert(
    name: string,
    phone: string,
    email: string,
    patch: Partial<VolunteerProfile> & { roles?: VolunteerRole[] }
  ) {
    if (!name.trim()) return;
    const key = profileKey(name, phone, email);
    const existing = map.get(key);
    const roles = new Set<VolunteerRole>(existing?.roles ?? []);
    for (const role of patch.roles ?? []) roles.add(role);

    map.set(key, {
      key,
      name: name.trim(),
      phone: phone.trim() || existing?.phone || "",
      email: email.trim() || existing?.email || "",
      roles: [...roles],
      shiftSlots: mergeShiftSlots(existing?.shiftSlots ?? [], patch.shiftSlots ?? []),
      interestedId: patch.interestedId ?? existing?.interestedId ?? null,
      onCallId: patch.onCallId ?? existing?.onCallId ?? null,
      interestedStatus: patch.interestedStatus ?? existing?.interestedStatus ?? null,
      onCallStatus: patch.onCallStatus ?? existing?.onCallStatus ?? null,
      captainDates: [...(existing?.captainDates ?? []), ...(patch.captainDates ?? [])],
      availabilitySummary: patch.availabilitySummary || existing?.availabilitySummary || "",
      source: patch.source || existing?.source || "",
    });
  }

  for (const shift of shifts) {
    const role: VolunteerRole = "shift";
    for (const volunteer of shift.volunteers) {
      if (!volunteer.name.trim()) continue;
      upsert(volunteer.name, volunteer.phone, volunteer.email, {
        roles: [role],
        shiftSlots: [
          {
            event_date: shift.event_date,
            shift_num: shift.shift_num,
            slot: `slot_${volunteer.slot_index}`,
          },
        ],
      });
    }
  }

  for (const v of interested) {
    const placedSlot = placedInterestedShiftSlot(v);
    upsert(v.name, v.phone, v.email, {
      roles: [
        ...(showsInterestedPlanningRole(v.status) ? (["interested"] as VolunteerRole[]) : []),
        ...(placedSlot ? (["shift"] as VolunteerRole[]) : []),
      ],
      ...(placedSlot ? { shiftSlots: [placedSlot] } : {}),
      interestedId: v.id,
      interestedStatus: v.status,
      ...(showsInterestedPlanningRole(v.status)
        ? {
            availabilitySummary: summarizeAvailability(
              v.available_dates,
              v.available_shifts,
              v.notes
            ),
            source: v.source,
          }
        : {}),
    });
  }

  for (const v of onCall) {
    upsert(v.name, v.phone, v.email, {
      roles: ["on-call"],
      onCallId: v.id,
      onCallStatus: v.status,
      availabilitySummary: summarizeAvailability(
        v.available_dates,
        v.available_shifts,
        v.availability
      ),
      source: ON_CALL_STATUS_LABELS[v.status],
    });
  }

  for (const captain of captains) {
    if (!captain?.name?.trim()) continue;
    upsert(captain.name, captain.phone, captain.email, {
      roles: ["day-captain"],
      captainDates: [{ event_date: captain.event_date, captain_slot: captain.captain_slot }],
    });
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const PROFILE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Planning-pool badge only while still awaiting shift assignment. */
export function showsInterestedPlanningRole(status: InterestedVolunteerStatus): boolean {
  return status === "interested";
}

/** First A–Z letter in a profile name for alphabet navigation. */
export function profileNameSortLetter(name: string): string {
  const match = name.trim().match(/[A-Za-z]/);
  return match ? match[0].toUpperCase() : "#";
}

export function profileAnchorId(key: string): string {
  return `volunteer-${key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function firstProfileKeyByLetter(
  profiles: Pick<VolunteerProfile, "key" | "name">[]
): Map<string, string> {
  const byLetter = new Map<string, string>();
  for (const profile of profiles) {
    const letter = profileNameSortLetter(profile.name);
    if (!byLetter.has(letter)) {
      byLetter.set(letter, profile.key);
    }
  }
  return byLetter;
}

export interface VolunteerProfileEditLink {
  href: string;
  label: string;
}

function shiftDashboardHref(slot: {
  event_date: string;
  shift_num: number;
}): string {
  if (!isSplitCaptainDay(slot.event_date)) {
    return dayDashboardHref(slot.event_date);
  }
  const captainSlot: CaptainSlot = slot.shift_num >= 4 ? "pm" : "am";
  return dayDashboardHref(slot.event_date, captainSlot);
}

function captainDashboardHref(assignment: VolunteerCaptainAssignment): string {
  const slot =
    assignment.captain_slot === "am" || assignment.captain_slot === "pm"
      ? assignment.captain_slot
      : undefined;
  return dayDashboardHref(assignment.event_date, slot);
}

/**
 * Most relevant operational destination for a profile name click.
 * Priority: Day Captain → scheduled shift → on-call pool → interested roster.
 */
export function volunteerProfilePrimaryUsageLink(
  profile: Pick<
    VolunteerProfile,
    "onCallId" | "interestedId" | "shiftSlots" | "captainDates"
  >
): VolunteerProfileEditLink | null {
  if (profile.captainDates.length > 0) {
    return {
      href: captainDashboardHref(profile.captainDates[0]),
      label: "Day Captain",
    };
  }
  if (profile.shiftSlots.length > 0) {
    return {
      href: shiftDashboardHref(profile.shiftSlots[0]),
      label: "Day shifts",
    };
  }
  if (profile.onCallId != null) {
    return {
      href: `/on-call#on-call-${profile.onCallId}`,
      label: "On-call pool",
    };
  }
  if (profile.interestedId != null) {
    return {
      href: `/interested#interested-${profile.interestedId}`,
      label: "Interested roster",
    };
  }
  return null;
}

/** Where phone/email can be updated for this deduped profile (profiles page is read-only). */
export function volunteerProfileContactEditLinks(
  profile: Pick<
    VolunteerProfile,
    "onCallId" | "interestedId" | "shiftSlots" | "captainDates"
  >
): VolunteerProfileEditLink[] {
  const links: VolunteerProfileEditLink[] = [];
  const seen = new Set<string>();

  function add(href: string, label: string) {
    if (seen.has(href)) return;
    seen.add(href);
    links.push({ href, label });
  }

  if (profile.onCallId != null) {
    add(`/on-call#on-call-${profile.onCallId}`, "On-call pool");
  }
  if (profile.interestedId != null) {
    add(`/interested#interested-${profile.interestedId}`, "Interested roster");
  }
  if (profile.shiftSlots.length > 0) {
    add(shiftDashboardHref(profile.shiftSlots[0]), "Day shifts");
  }
  if (profile.captainDates.length > 0) {
    add(captainDashboardHref(profile.captainDates[0]), "Day Captain");
  }

  return links;
}

export function roleLabel(role: VolunteerRole): string {
  switch (role) {
    case "setup":
      return "Setup team";
    case "shift":
      return "Shift volunteer";
    case "interested":
      return "Interested";
    case "on-call":
      return "On-call backup";
    case "day-captain":
      return "Day Captain";
  }
}