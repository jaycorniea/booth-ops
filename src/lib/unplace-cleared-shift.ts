import { hasVolunteer } from "./event-dates";
import { formatVolunteerLastInitial } from "./volunteer-display-name";
import type { Shift } from "./db/types";

export function identityKeys(name: string, phone: string, email: string): Set<string> {
  const keys = new Set<string>();
  const phoneKey = phone.replace(/\D/g, "");
  if (phoneKey) keys.add(`phone:${phoneKey}`);
  const emailKey = email.trim().toLowerCase();
  if (emailKey) keys.add(`email:${emailKey}`);
  const full = name.trim().toLowerCase();
  if (full) keys.add(`name:${full}`);
  const initial = formatVolunteerLastInitial(name).trim().toLowerCase();
  if (initial) keys.add(`name:${initial}`);
  return keys;
}

function contactKeysOf(keys: Set<string>): string[] {
  return [...keys].filter((key) => key.startsWith("phone:") || key.startsWith("email:"));
}

export function identitiesOverlap(a: Set<string>, b: Set<string>): boolean {
  const aContact = contactKeysOf(a);
  const bContact = contactKeysOf(b);
  if (aContact.length && bContact.length) {
    return aContact.some((key) => b.has(key));
  }
  for (const key of a) {
    if (b.has(key)) return true;
  }
  return false;
}

export type ShiftOccupant = { name: string; phone: string; email: string };

export function shiftOccupants(shift: Shift | object): ShiftOccupant[] {
  const row = shift as Shift;
  if (Array.isArray(row.volunteers)) {
    return row.volunteers
      .filter((v) => hasVolunteer(v.name))
      .map((v) => ({ name: v.name, phone: v.phone ?? "", email: v.email ?? "" }));
  }
  return [];
}

export function occupantContactKeys(occupants: ShiftOccupant[]): Set<string> {
  const keys = new Set<string>();
  for (const row of occupants) {
    for (const key of identityKeys(row.name, row.phone, row.email)) keys.add(key);
  }
  return keys;
}

export function occupantsByShift(
  shifts: Array<{ event_date?: string; shift_num: number } & object>
): Map<string, ShiftOccupant[]> {
  const map = new Map<string, ShiftOccupant[]>();
  for (const shift of shifts) {
    const date = (shift as { event_date?: string }).event_date ?? "";
    map.set(`${date}|${shift.shift_num}`, shiftOccupants(shift));
  }
  return map;
}

function volunteerOnShift(
  volunteer: { name: string; phone: string; email: string },
  occupants: ShiftOccupant[]
): boolean {
  const volKeys = identityKeys(volunteer.name, volunteer.phone, volunteer.email);
  return occupants.some((row) =>
    identitiesOverlap(volKeys, identityKeys(row.name, row.phone, row.email))
  );
}

export function shouldUnplaceInterested(
  volunteer: {
    status: string;
    name: string;
    phone: string;
    email: string;
    placed_event_date?: string | null;
    placed_shift_num?: number | null;
  },
  occupantsByShiftMap: Map<string, ShiftOccupant[]>
): boolean {
  if (volunteer.status !== "placed") return false;
  const date = (volunteer.placed_event_date ?? "").trim();
  const shiftNum = volunteer.placed_shift_num;
  if (!date || shiftNum == null) return true;
  const remaining = occupantsByShiftMap.get(`${date}|${shiftNum}`);
  if (!remaining) return true;
  return !volunteerOnShift(volunteer, remaining);
}

export function shiftMatchForInterested(
  volunteer: {
    status: string;
    name: string;
    phone: string;
    email: string;
  },
  occupantsByShiftMap: Map<string, ShiftOccupant[]>
): { eventDate: string; shiftNum: number } | null {
  if (volunteer.status !== "interested") return null;
  for (const [shiftKey, occupants] of occupantsByShiftMap) {
    if (!volunteerOnShift(volunteer, occupants)) continue;
    const [eventDate, num] = shiftKey.split("|");
    const shiftNum = Number(num);
    if (!eventDate || Number.isNaN(shiftNum)) continue;
    return { eventDate, shiftNum };
  }
  return null;
}
