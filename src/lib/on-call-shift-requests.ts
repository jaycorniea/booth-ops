import { formatEventDate, getShiftScheduleEntry } from "./event-dates";
import { formatPortalTimestampCompact } from "./portal-time";

export type OnCallShiftRequestStatus = "pending" | "fulfilled" | "cleared";

export interface OnCallShiftRequest {
  id: number;
  on_call_id: number;
  event_date: string;
  shift_num: number;
  contacted_at: string;
  status: OnCallShiftRequestStatus;
}

export function onCallShiftRequestKey(eventDate: string, shiftNum: number): string {
  return `${eventDate}|${shiftNum}`;
}

export function summarizeOnCallShiftRequest(request: Pick<
  OnCallShiftRequest,
  "event_date" | "shift_num" | "contacted_at"
>): string {
  const shift = getShiftScheduleEntry(request.shift_num);
  const slot = `${formatEventDate(request.event_date)} · ${shift?.label ?? `shift ${request.shift_num}`}`;
  return `${slot} · contacted ${formatPortalTimestampCompact(request.contacted_at)}`;
}

export function summarizeOnCallPendingShiftRequests(
  requests: Pick<OnCallShiftRequest, "event_date" | "shift_num" | "contacted_at">[]
): string | null {
  const pending = requests.filter(Boolean);
  if (!pending.length) return null;
  return pending.map((request) => summarizeOnCallShiftRequest(request)).join("; ");
}

export function hasPendingOnCallShiftRequest(
  requests: Pick<OnCallShiftRequest, "event_date" | "shift_num" | "status">[],
  eventDate: string,
  shiftNum: number
): boolean {
  return requests.some(
    (request) =>
      request.status === "pending" &&
      request.event_date === eventDate &&
      request.shift_num === shiftNum
  );
}

export function pendingOnCallShiftRequestContactedAt(
  requests: Pick<OnCallShiftRequest, "event_date" | "shift_num" | "status" | "contacted_at">[],
  eventDate: string,
  shiftNum: number
): string | null {
  const match = requests.find(
    (request) =>
      request.status === "pending" &&
      request.event_date === eventDate &&
      request.shift_num === shiftNum
  );
  return match?.contacted_at ?? null;
}