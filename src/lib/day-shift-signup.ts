import type { Shift } from "./db";
import { splitAvailability } from "./on-call-form";
import { portalBaseUrl } from "./portal-url";
import { shiftHasOpenVolunteerSlot } from "./shift-slots";

export { shiftHasOpenVolunteerSlot };

export function openShiftNumsFromShifts(shifts: Shift[]): number[] {
  return shifts
    .filter(shiftHasOpenVolunteerSlot)
    .map((shift) => shift.shift_num)
    .sort((a, b) => a - b);
}

export async function listOpenShiftNumsForEventDate(eventDate: string): Promise<number[]> {
  const { getShiftsForDate } = await import("./db");
  const shifts = await getShiftsForDate(eventDate);
  return openShiftNumsFromShifts(shifts);
}

export function restrictShiftPreferenceToOpen(
  availableShifts: string,
  openShiftNums: number[]
): string | null {
  const open = new Set(openShiftNums.map(String));
  if (open.size === 0) return null;

  const picks = splitAvailability(availableShifts);
  if (picks.includes("any")) {
    return [...open].sort((a, b) => Number(a) - Number(b)).join(",");
  }

  const valid = picks.filter((value) => open.has(value));
  return valid.length > 0 ? valid.join(",") : null;
}

export function dayShiftSignupPath(eventDate: string): string {
  return `/join-shift/${eventDate}`;
}

export function dayShiftSignupUrl(eventDate: string, baseUrl = portalBaseUrl()): string {
  return `${baseUrl}${dayShiftSignupPath(eventDate)}`;
}
