import type { CaptainFeedback } from "@/lib/db";
import { feedbackCategoryLabel, feedbackSubmitterLabel } from "@/lib/captain-feedback";
import { formatEventDate } from "@/lib/event-dates";
import { formatPortalDateSubmitted } from "@/lib/portal-time";

function hasPiResponse(entry: CaptainFeedback): boolean {
  return Boolean(entry.admin_response?.trim());
}

export function CaptainFeedbackGlanceTable({ entries }: { entries: CaptainFeedback[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">No feedback yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
            <th className="py-1.5 pr-3 whitespace-nowrap">Submitted</th>
            <th className="py-1.5 pr-3">Name</th>
            <th className="py-1.5 pr-3">Topic</th>
            <th className="py-1.5 pr-3 whitespace-nowrap">Day</th>
            <th className="py-1.5 pr-3 w-12">Rating</th>
            <th className="py-1.5 pr-3 w-10">PI</th>
            <th className="py-1.5 w-12" />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-slate-100 align-top hover:bg-slate-50/80">
              <td className="py-1.5 pr-3 whitespace-nowrap text-xs text-slate-600">
                {formatPortalDateSubmitted(entry.created_at)}
              </td>
              <td className="py-1.5 pr-3 font-medium text-slate-900">
                {feedbackSubmitterLabel(entry.name)}
              </td>
              <td
                className="py-1.5 pr-3 text-xs text-slate-600 max-w-[10rem]"
                title={feedbackCategoryLabel(entry.category)}
              >
                <span className="line-clamp-2">{feedbackCategoryLabel(entry.category)}</span>
              </td>
              <td className="py-1.5 pr-3 whitespace-nowrap text-xs text-slate-600">
                {entry.event_date ? formatEventDate(entry.event_date) : "—"}
              </td>
              <td className="py-1.5 pr-3 text-xs text-slate-600">
                {entry.portal_rating != null ? `${entry.portal_rating}/5` : "—"}
              </td>
              <td className="py-1.5 pr-3 text-xs text-slate-600">
                {hasPiResponse(entry) ? "✓" : "—"}
              </td>
              <td className="py-1.5 text-xs">
                <a href={`#feedback-${entry.id}`} className="text-blue-700 underline">
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
