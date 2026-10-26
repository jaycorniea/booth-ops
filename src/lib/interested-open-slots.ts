import type { Shift } from "@/lib/db";
import { officialSlotIndexes, type VolunteerSlot } from "@/lib/shift-slots";
import {
  formatEventDate,
  getEventDates,
  getShiftScheduleEntry,
  hasVolunteer,
  isEventDate,
  getShiftSchedule,
} from "@/lib/event-dates";
import { splitAvailability } from "@/lib/interested-volunteer-form";

export type OpenPreferredSlot = {
  eventDate: string;
  eventDateLabel: string;
  shiftNum: number;
  shiftId: number;
  shiftLabel: string;
  openSlots: number[];
};

export function slotIsOpen(shift: Shift, slot: VolunteerSlot): boolean {
  const volunteer = shift.volunteers.find((v) => v.slot_index === slot);
  return !hasVolunteer(volunteer?.name);
}

export function resolveOpenSlot(
  shift: Shift,
  requested: "auto" | VolunteerSlot
): VolunteerSlot | null {
  const order = officialSlotIndexes();
  if (requested === "auto") {
    return order.find((slot) => slotIsOpen(shift, slot)) ?? null;
  }
  if (!order.includes(requested)) return null;
  return slotIsOpen(shift, requested) ? requested : null;
}

export function listOpenPreferredSlots(
  volunteer: { available_dates: string; available_shifts: string },
  allShifts: Shift[]
): OpenPreferredSlot[] {
  const datePrefs = splitAvailability(volunteer.available_dates);
  const shiftPrefs = splitAvailability(volunteer.available_shifts);

  const dates = datePrefs.includes("any")
    ? getEventDates()
    : datePrefs.filter((d) => isEventDate(d)).sort();

  const shiftNums = shiftPrefs.includes("any")
    ? getShiftSchedule().map((s) => s.num)
    : shiftPrefs
        .map((s) => Number(s))
        .filter((n) => getShiftScheduleEntry(n))
        .sort((a, b) => a - b);

  const byKey = new Map(
    allShifts.map((s) => [`${s.event_date}:${s.shift_num}`, s] as const)
  );

  const open: OpenPreferredSlot[] = [];
  for (const eventDate of dates) {
    for (const shiftNum of shiftNums) {
      const shift = byKey.get(`${eventDate}:${shiftNum}`);
      if (!shift?.id) continue;
      const openSlots = officialSlotIndexes().filter((slot) => slotIsOpen(shift, slot));
      if (!openSlots.length) continue;
      open.push({
        eventDate,
        eventDateLabel: formatEventDate(eventDate),
        shiftNum,
        shiftId: shift.id,
        shiftLabel: getShiftScheduleEntry(shiftNum)?.label ?? `Shift ${shiftNum}`,
        openSlots,
      });
    }
  }
  return open;
}
