import type { Shift, ShiftVolunteer } from "./db/types";
import { hasVolunteer } from "./event-dates";
import { getActiveEventSettings } from "./event-settings";

export function officialSlotsPerShift(override?: number): number {
  return override ?? getActiveEventSettings().officialSlotsPerShift;
}

export function officialSlotIndexes(count = officialSlotsPerShift()): number[] {
  return Array.from({ length: count }, (_, i) => i + 1);
}

export function emptyVolunteer(slotIndex: number): ShiftVolunteer {
  return { slot_index: slotIndex, name: "", phone: "", email: "" };
}

export function emptyVolunteers(count = officialSlotsPerShift()): ShiftVolunteer[] {
  return officialSlotIndexes(count).map(emptyVolunteer);
}

export function padVolunteers(
  volunteers: ShiftVolunteer[] | undefined,
  count = officialSlotsPerShift()
): ShiftVolunteer[] {
  const byIndex = new Map((volunteers ?? []).map((v) => [v.slot_index, v]));
  return officialSlotIndexes(count).map((index) => {
    const row = byIndex.get(index);
    if (!row) return emptyVolunteer(index);
    return {
      slot_index: index,
      name: row.name ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
    };
  });
}

export function volunteerAt(shift: Shift, slotIndex: number): ShiftVolunteer {
  return shift.volunteers.find((v) => v.slot_index === slotIndex) ?? emptyVolunteer(slotIndex);
}

export function slotNameKey(slotIndex: number): string {
  return `slot_${slotIndex}_name`;
}

export function slotPhoneKey(slotIndex: number): string {
  return `slot_${slotIndex}_phone`;
}

export function slotEmailKey(slotIndex: number): string {
  return `slot_${slotIndex}_email`;
}

export function volunteerSlotLabel(slotIndex: number): string {
  return `Volunteer ${slotIndex}`;
}

export function volunteerSlotVacancyLabel(slotIndex: number): string {
  return `Vol ${slotIndex} open`;
}

export function countFilledOfficialSlots(shift: Shift): number {
  return shift.volunteers.filter((v) => hasVolunteer(v.name)).length;
}

export type VolunteerSlot = number;

export function volunteerSlots(): number[] {
  return officialSlotIndexes();
}

export const VOLUNTEER_SLOTS = volunteerSlots();

export const VOLUNTEER_SLOT_LABEL: Record<number, string> = Object.fromEntries(
  volunteerSlots().map((n) => [n, volunteerSlotLabel(n)])
);

export function extraVolunteerFillLabel(_count = 0): string {
  return "";
}

export function shiftHasOpenVolunteerSlot(shift: Shift): boolean {
  const n = officialSlotsPerShift();
  const filled = padVolunteers(shift.volunteers, n).filter((v) => hasVolunteer(v.name)).length;
  if (filled < n) return true;
  return shift.no_show === 1;
}
