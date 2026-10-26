import type { CaptainSlot } from "../day-captain-slots";
import type { OnCallVolunteerStatus } from "../on-call-status";

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

export type { OnCallVolunteerStatus } from "../on-call-status";

export interface OnCallVolunteer {
  id: number;
  name: string;
  phone: string;
  email: string;
  availability: string;
  notice_minutes: number;
  available_dates: string;
  available_shifts: string;
  bilingual: number;
  last_contacted: string;
  contacted_event_date: string;
  contacted_shift_num: number | null;
  pending_shift_requests?: import("../on-call-shift-requests").OnCallShiftRequest[];
  status: OnCallVolunteerStatus;
  placed_event_date: string;
  placed_shift_num: number | null;
  created_at: string;
  updated_at: string;
}

export type InterestedVolunteerStatus = "interested" | "placed" | "withdrawn";

export interface InterestedVolunteer {
  id: number;
  name: string;
  phone: string;
  email: string;
  notes: string;
  source: string;
  available_dates: string;
  available_shifts: string;
  bilingual: number;
  status: InterestedVolunteerStatus;
  placed_event_date: string;
  placed_shift_num: number | null;
  last_contacted: string;
  created_at: string;
  updated_at: string;
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
