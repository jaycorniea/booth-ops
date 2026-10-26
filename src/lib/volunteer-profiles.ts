import { type CaptainSlot, isSplitCaptainDay } from "./day-captain-slots";
import { dayDashboardHref } from "./day-routes";
import { getEventDates } from "./event-dates";
import { getDayCaptains, getShiftsForDate } from "./db";

export type VolunteerRole = "shift" | "setup" | "day-captain";

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
  captainDates: VolunteerCaptainAssignment[];
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

export async function listVolunteerProfiles(): Promise<VolunteerProfile[]> {
  const scheduleDates = getEventDates();
  const shiftGroups = await Promise.all(scheduleDates.map((d) => getShiftsForDate(d)));
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
      captainDates: [...(existing?.captainDates ?? []), ...(patch.captainDates ?? [])],
    });
  }

  for (const shift of shifts) {
    for (const volunteer of shift.volunteers) {
      if (!volunteer.name.trim()) continue;
      upsert(volunteer.name, volunteer.phone, volunteer.email, {
        roles: ["shift"],
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
 * Priority: Day Captain, then scheduled shift.
 */
export function volunteerProfilePrimaryUsageLink(
  profile: Pick<VolunteerProfile, "shiftSlots" | "captainDates">
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
  return null;
}

/** Where phone/email can be updated for this deduped profile (profiles page is read-only). */
export function volunteerProfileContactEditLinks(
  profile: Pick<VolunteerProfile, "shiftSlots" | "captainDates">
): VolunteerProfileEditLink[] {
  const links: VolunteerProfileEditLink[] = [];
  const seen = new Set<string>();

  function add(href: string, label: string) {
    if (seen.has(href)) return;
    seen.add(href);
    links.push({ href, label });
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
    case "day-captain":
      return "Day Captain";
  }
}
