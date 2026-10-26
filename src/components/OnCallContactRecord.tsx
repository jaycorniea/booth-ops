import type { OnCallVolunteer } from "@/lib/db";
import { summarizeOnCallShiftRequest } from "@/lib/on-call-shift-requests";
import { summarizeOnCallVolunteerOutreach } from "@/lib/on-call-display";

export function OnCallContactRecord({
  volunteer,
  className = "mt-1 space-y-1",
  itemClassName = "rounded border border-violet-200 bg-violet-50/80 px-2.5 py-1.5 text-xs font-medium text-violet-900",
}: {
  volunteer: Pick<
    OnCallVolunteer,
    | "pending_shift_requests"
    | "last_contacted"
    | "contacted_event_date"
    | "contacted_shift_num"
  >;
  className?: string;
  itemClassName?: string;
}) {
  const pending = volunteer.pending_shift_requests ?? [];
  if (pending.length > 0) {
    return (
      <div className={className}>
        <p className="text-xs font-medium text-violet-900">
          Pending shift outreach ({pending.length})
        </p>
        <ul className="space-y-1">
          {pending.map((request) => (
            <li key={request.id} className={itemClassName}>
              {summarizeOnCallShiftRequest(request)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const summary = summarizeOnCallVolunteerOutreach(volunteer);
  if (!summary) return null;

  return <p className={itemClassName}>{summary}</p>;
}