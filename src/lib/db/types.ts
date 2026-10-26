import type { CaptainSlot } from "../day-captain-slots";

export interface ShiftVolunteer {
  slot_index: number;
  name: string;
  phone: string;
  email: string;
}

export interface Shift {
  id: number;
  event_date: string;
  shift_num: number;
  volunteers: ShiftVolunteer[];
  checked_in: number;
  no_show: number;
  notes: string;
}

export interface DayCaptainRow {
  event_date: string;
  captain_slot: CaptainSlot;
  name: string;
  phone: string;
  email: string;
  district?: string;
}
