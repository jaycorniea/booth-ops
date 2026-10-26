import { FeedbackAdminResponsePanel } from "@/components/FeedbackAdminResponse";
import type { CaptainFeedback } from "@/lib/db";
import { feedbackCategoryLabel, feedbackSubmitterLabel } from "@/lib/captain-feedback";
import { formatEventDate } from "@/lib/event-dates";
import { formatPortalTimestampCompact } from "@/lib/portal-time";

export function CaptainFeedbackManageList({
  entries,
  isAdmin,
}: {
  entries: CaptainFeedback[];
  isAdmin: boolean;
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="divide-y divide-slate-100">
      {entries.map((entry) => (
        <article
          key={entry.id}
          id={`feedback-${entry.id}`}
          className="scroll-mt-6 py-3 first:pt-0 last:pb-0"
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-slate-500">
            <span className="text-sm font-medium text-slate-900">
              {feedbackSubmitterLabel(entry.name)}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5">
              {feedbackCategoryLabel(entry.category)}
            </span>
            {entry.event_date ? <span>{formatEventDate(entry.event_date)}</span> : null}
            {entry.portal_rating != null ? <span>{entry.portal_rating}/5</span> : null}
            <span>{formatPortalTimestampCompact(entry.created_at)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{entry.comments}</p>
          <FeedbackAdminResponsePanel entry={entry} isAdmin={isAdmin} />
        </article>
      ))}
    </div>
  );
}
