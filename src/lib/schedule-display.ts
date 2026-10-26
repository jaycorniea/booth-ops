import type { DayCaptainRow, Shift } from "./db";
import {
  formatCaptainSlotSummary,
  hasAllDayCaptainsAssigned,
} from "./day-captain-slots";
import { volunteerSlotLabel, type VolunteerSlot } from "./shift-slots";
import { formatEventDate, formatShiftLabel, hasVolunteer } from "./event-dates";
import { countShiftSlots } from "./kpi-snapshots";
import { formatPhoneDisplay } from "./phone-format";
import { formatVolunteerDisplayName } from "./volunteer-display-name";

export type ScheduleVolunteerColumn = {
  slot: VolunteerSlot;
  label: string;
  name: string;
  phone: string;
  email: string;
  extra: boolean;
};

export function scheduleVolunteerColumns(shift: Shift): ScheduleVolunteerColumn[] {
  return shift.volunteers.map((volunteer) => ({
    slot: volunteer.slot_index,
    label: volunteerSlotLabel(volunteer.slot_index),
    name: volunteer.name,
    phone: volunteer.phone,
    email: volunteer.email,
    extra: false,
  }));
}

export function summarizeScheduleSlotFill(shifts: Shift[]): { filled: number; total: number } {
  return countShiftSlots(shifts);
}

export function summarizeScheduleCaptainGlance(
  eventDate: string,
  captains: DayCaptainRow[]
): { assigned: boolean; label: string } {
  const assigned = hasAllDayCaptainsAssigned(eventDate, captains);
  const summary = formatCaptainSlotSummary(eventDate, captains).trim();
  return { assigned, label: summary || "Open" };
}

export function scheduleVolunteerContactLine(
  name?: string | null,
  phone?: string | null,
  email?: string | null
): string {
  if (!hasVolunteer(name)) return "Open";
  const parts = [
    formatVolunteerDisplayName(name ?? ""),
    phone?.trim() ? formatPhoneDisplay(phone) : "",
    email?.trim() ?? "",
  ].filter(Boolean);
  return parts.join(" · ");
}

export function scheduleDayNeedsAttention(
  eventDate: string,
  captains: DayCaptainRow[],
  shifts: Shift[]
): boolean {
  const { assigned } = summarizeScheduleCaptainGlance(eventDate, captains);
  const { filled, total } = summarizeScheduleSlotFill(shifts);
  return !assigned || filled < total;
}

export function formatScheduleGlanceDate(eventDate: string): string {
  return formatEventDate(eventDate);
}

export function formatScheduleShiftLabel(shiftNum: number): string {
  return formatShiftLabel(shiftNum);
}
