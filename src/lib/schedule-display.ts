import type { Shift } from "./db";
import { volunteerSlotLabel, type VolunteerSlot } from "./shift-slots";
import { formatShiftLabel } from "./event-dates";

export type ScheduleVolunteerColumn = {
  slot: VolunteerSlot;
  label: string;
  name: string;
  phone: string;
  email: string;
};

export function scheduleVolunteerColumns(shift: Shift): ScheduleVolunteerColumn[] {
  return shift.volunteers.map((volunteer) => ({
    slot: volunteer.slot_index,
    label: volunteerSlotLabel(volunteer.slot_index),
    name: volunteer.name,
    phone: volunteer.phone,
    email: volunteer.email,
  }));
}

export function formatScheduleShiftLabel(shiftNum: number): string {
  return formatShiftLabel(shiftNum);
}
