import type { InterestedVolunteer, OnCallVolunteer, Shift } from "@/lib/db";
import { emptyVolunteers } from "@/lib/shift-slots";

export function mockOnCallVolunteer(
  overrides: Partial<OnCallVolunteer> = {}
): OnCallVolunteer {
  return {
    id: 1,
    name: "Alex Rivera",
    phone: "555-0100",
    email: "alex@example.com",
    availability: "",
    notice_minutes: 45,
    available_dates: "any",
    available_shifts: "any",
    bilingual: 0,
    last_contacted: "",
    contacted_event_date: "",
    contacted_shift_num: null,
    pending_shift_requests: [],
    status: "approved",
    placed_event_date: "",
    placed_shift_num: null,
    created_at: "2026-06-01 12:00:00",
    updated_at: "2026-06-01 12:00:00",
    ...overrides,
  };
}

export function mockInterestedVolunteer(
  overrides: Partial<InterestedVolunteer> = {}
): InterestedVolunteer {
  return {
    id: 1,
    name: "Jamie Chen",
    phone: "555-0101",
    email: "jamie@example.com",
    notes: "",
    source: "",
    available_dates: "any",
    available_shifts: "any",
    bilingual: 0,
    status: "interested",
    placed_event_date: "",
    placed_shift_num: null,
    last_contacted: "",
    created_at: "2026-06-01 12:00:00",
    updated_at: "2026-06-01 12:00:00",
    ...overrides,
  };
}

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
