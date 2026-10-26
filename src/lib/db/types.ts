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

export interface Issue {
  id: number;
  event_date: string;
  shift: string;
  category: string;
  description: string;
  resolved: number;
  admin_response: string;
  admin_response_at: string | null;
  created_at: string;
}

export interface CaptainFeedback {
  id: number;
  name: string;
  email: string;
  event_date: string;
  category: string;
  portal_rating: number | null;
  comments: string;
  admin_response: string;
  admin_response_at: string | null;
  created_at: string;
}

export interface DayCaptainRow {
  event_date: string;
  captain_slot: CaptainSlot;
  name: string;
  phone: string;
  email: string;
  district?: string;
}
