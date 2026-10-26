import type { Shift } from "@/lib/db";
import { emptyVolunteers } from "@/lib/shift-slots";

export function mockShift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: 1,
    event_date: "2026-08-14",
    shift_num: 1,
    volunteers: emptyVolunteers(),
    checked_in: 0,
    no_show: 0,
    notes: "",
    ...overrides,
  };
}
