import type { OnCallVolunteer } from "./db";
import { formatEventDate, formatIsoDate, getShiftScheduleEntry, getShiftSchedule } from "./event-dates";
import { formatPhoneDisplay } from "./phone-format";
import { splitAvailability } from "./on-call-form";
import {
  summarizeOnCallPendingShiftRequests,
  summarizeOnCallShiftRequest,
  type OnCallShiftRequest,
} from "./on-call-shift-requests";
import { ON_CALL_STATUS_LABELS, type OnCallVolunteerStatus } from "./on-call-status";

export function summarizeOnCallAvailability(v: {
  available_dates: string;
  available_shifts: string;
  notice_minutes: number;
  availability: string;
  bilingual: number;
}): string {
  const dates = splitAvailability(v.available_dates);
  const shifts = splitAvailability(v.available_shifts);
  const dateLabel = dates.includes("any")
    ? "Any event day"
    : dates.map((d) => formatEventDate(d)).join(", ");
  const shiftLabel = shifts.includes("any")
    ? "Any shift"
    : shifts
        .map((s) => getShiftSchedule().find((x) => x.num === Number(s))?.label ?? s)
        .join(", ");
  const spanishLabel = v.bilingual === 1 ? " · Spanish speaker" : "";
  const noteLabel = v.availability?.trim() ? ` · ${v.availability.trim()}` : "";
  return `${dateLabel} · ${shiftLabel} · ${v.notice_minutes ?? 45} min notice${spanishLabel}${noteLabel}`;
}

/** One-line preferences for compact roster rows. */
export function summarizeOnCallAvailabilityCompact(v: {
  available_dates: string;
  available_shifts: string;
  notice_minutes: number;
}): string {
  const dates = splitAvailability(v.available_dates);
  const shifts = splitAvailability(v.available_shifts);
  const dateLabel = dates.includes("any")
    ? "Any day"
    : dates.map((d) => formatIsoDate(d).slice(0, 5)).join(", ");
  const shiftLabel = shifts.includes("any")
    ? "Any shift"
    : shifts
        .map((s) => getShiftSchedule().find((x) => x.num === Number(s))?.label ?? `S${s}`)
        .join(", ");
  return `${dateLabel} · ${shiftLabel} · ${v.notice_minutes ?? 45}m`;
}

export function onCallContactLine(v: Pick<OnCallVolunteer, "phone" | "email">): string {
  const phone = v.phone?.trim();
  const parts = [phone ? formatPhoneDisplay(phone) : "", v.email?.trim()].filter(Boolean);
  return parts.join(" · ") || "—";
}

export type OnCallGlancePoolBadge = {
  label: string;
  className: string;
};

/** Name-column badge for active-pool roster rows (glance table and manage cards). */
export function onCallGlancePoolBadge(
  v: Pick<OnCallVolunteer, "status" | "pending_shift_requests">
): OnCallGlancePoolBadge | null {
  const pending = v.pending_shift_requests?.length ?? 0;
  if (pending > 0) {
    return {
      label: pending === 1 ? "Shift requested" : `${pending} pending`,
      className: "bg-violet-100 text-violet-800",
    };
  }
  if (v.status === "approved") {
    return {
      label: "Available",
      className: "bg-green-100 text-green-800",
    };
  }
  return null;
}

/** Event day + timeslot for a shift outreach or assignment. */
export function summarizeOnCallShiftSlot(v: {
  event_date: string;
  shift_num: number | null;
}): string {
  if (!v.event_date || v.shift_num == null) return "—";
  const shift = getShiftScheduleEntry(v.shift_num);
  return `${formatEventDate(v.event_date)} · ${shift?.label ?? `shift ${v.shift_num}`}`;
}

/** Compact assignment line for on-call volunteers placed on a shift. */
export function summarizeOnCallPlacement(v: {
  placed_event_date: string;
  placed_shift_num: number | null;
}): string {
  if (!v.placed_event_date || v.placed_shift_num == null) return "—";
  const shift = getShiftScheduleEntry(v.placed_shift_num);
  const dateLabel = formatIsoDate(v.placed_event_date).slice(0, 5);
  return `${dateLabel} · ${shift?.label ?? `shift ${v.placed_shift_num}`}`;
}

/** Pending outreach lines for a volunteer (supports multiple shift requests). */
export function summarizeOnCallVolunteerOutreach(
  volunteer: Pick<
    OnCallVolunteer,
    | "pending_shift_requests"
    | "last_contacted"
    | "contacted_event_date"
    | "contacted_shift_num"
  >
): string | null {
  const pending = volunteer.pending_shift_requests ?? [];
  if (pending.length) {
    return summarizeOnCallPendingShiftRequests(pending);
  }
  if (!volunteer.last_contacted?.trim()) return null;
  if (volunteer.contacted_event_date && volunteer.contacted_shift_num != null) {
    return summarizeOnCallShiftRequest({
      event_date: volunteer.contacted_event_date,
      shift_num: volunteer.contacted_shift_num,
      contacted_at: volunteer.last_contacted,
    });
  }
  return null;
}

/** @deprecated Use summarizeOnCallVolunteerOutreach */
export function summarizeOnCallContactRecord(
  volunteer: Pick<
    OnCallVolunteer,
    | "pending_shift_requests"
    | "last_contacted"
    | "contacted_event_date"
    | "contacted_shift_num"
  >
): string | null {
  return summarizeOnCallVolunteerOutreach(volunteer);
}

/** Glance-row preferences: availability unless outreach is the focus. */
export function summarizeOnCallGlancePreferences(
  v: Pick<
    OnCallVolunteer,
    | "status"
    | "available_dates"
    | "available_shifts"
    | "notice_minutes"
    | "pending_shift_requests"
    | "last_contacted"
    | "contacted_event_date"
    | "contacted_shift_num"
  >
): string {
  if (v.status === "shift_requested") {
    const outreach = summarizeOnCallVolunteerOutreach(v);
    if (outreach) return outreach;
  }
  return summarizeOnCallAvailabilityCompact(v);
}

export function onCallStatusLabel(status: OnCallVolunteerStatus): string {
  return ON_CALL_STATUS_LABELS[status];
}

export type { OnCallShiftRequest };