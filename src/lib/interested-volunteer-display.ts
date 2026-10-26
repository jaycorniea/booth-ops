import { formatEventDate, formatIsoDate, getShiftScheduleEntry, getShiftSchedule } from "./event-dates";
import type { InterestedVolunteer } from "./db";
import { formatPhoneDisplay } from "./phone-format";
import { splitAvailability } from "./interested-volunteer-form";

export function summarizeInterestedAvailability(v: {
  available_dates: string;
  available_shifts: string;
  bilingual: number;
  notes: string;
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
  const notesLabel = v.notes ? ` · ${v.notes}` : "";
  return `${dateLabel} · ${shiftLabel}${spanishLabel}${notesLabel}`;
}

/** One-line preferences for compact roster rows. */
export function summarizeInterestedAvailabilityCompact(v: {
  available_dates: string;
  available_shifts: string;
  REMOVED_ticket?: number;
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
  const ticketLabel = v.REMOVED_ticket === 1 ? " · D8 ticket" : "";
  return `${dateLabel} · ${shiftLabel}${ticketLabel}`;
}

export function interestedContactLine(v: Pick<InterestedVolunteer, "phone" | "email">): string {
  const phone = v.phone?.trim();
  const parts = [phone ? formatPhoneDisplay(phone) : "", v.email?.trim()].filter(Boolean);
  return parts.join(" · ") || "—";
}

/** Status pill for interested roster cards and tables. */
export function interestedStatusBadge(status: string): { label: string; className: string } {
  if (status === "placed") {
    return {
      label: "Placed",
      className: "rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800",
    };
  }
  if (status === "withdrawn") {
    return {
      label: "Withdrawn",
      className: "rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600",
    };
  }
  return {
    label: "Interested",
    className: "rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800",
  };
}

/** Compact assignment line for placed interested volunteers. */
export function summarizeInterestedPlacement(v: {
  placed_event_date: string;
  placed_shift_num: number | null;
}): string {
  if (!v.placed_event_date || v.placed_shift_num == null) return "—";
  const shift = getShiftScheduleEntry(v.placed_shift_num);
  const dateLabel = formatIsoDate(v.placed_event_date).slice(0, 5);
  return `${dateLabel} · ${shift?.label ?? `shift ${v.placed_shift_num}`}`;
}