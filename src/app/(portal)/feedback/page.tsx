import { CaptainFeedbackGlanceTable } from "@/components/CaptainFeedbackGlanceTable";
import { CaptainFeedbackManageList } from "@/components/CaptainFeedbackManageList";
import { FeedbackSubmitButton } from "@/components/FeedbackSubmitButton";
import { PortalBanner, PortalQueryBanner } from "@/components/PortalBanner";
import { Card } from "@/components/ui";
import { PORTAL_FEEDBACK_ERRORS } from "@/lib/portal-query-feedback";
import { submitCaptainFeedbackAction } from "@/lib/actions";
import { canWrite, isAdmin } from "@/lib/auth";
import { CAPTAIN_FEEDBACK_CATEGORIES } from "@/lib/captain-feedback";
import { formatEventDate, getEventDates } from "@/lib/event-dates";
import {
  isCaptainFeedbackOpenForPortal,
  isIssueLogOpenForPortal,
} from "@/lib/portal-window-sim-server";
import { PORTAL_WINDOW_META } from "@/lib/portal-windows";
import { listCaptainFeedback } from "@/lib/db";
import Link from "next/link";

const fieldClass =
  "w-full rounded border border-slate-300 px-1.5 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function feedbackHeaderNote(options: {
  open: boolean;
  write: boolean;
  issueLogOpen: boolean;
}): string {
  if (!options.open) {
    const closed = `Closed for Window ${PORTAL_WINDOW_META.c.code} (${PORTAL_WINDOW_META.c.label}).`;
    if (options.issueLogOpen) {
      return `${closed} Use the issue log for day-of problems.`;
    }
    return `${closed} Issue logging opens in Window ${PORTAL_WINDOW_META.c.code}.`;
  }
  if (!options.write) {
    return "Visible to all captains · view-only sign-in";
  }
  return "Pre-event suggestions for the coordinator · visible to all captains";
}

export default async function CaptainFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; response_saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const [write, admin] = await Promise.all([canWrite(), isAdmin()]);
  const [open, issueLogOpen] = await Promise.all([
    isCaptainFeedbackOpenForPortal(),
    isIssueLogOpenForPortal(),
  ]);
  const entries = await listCaptainFeedback();
  const dates = getEventDates();
  const headerNote = feedbackHeaderNote({ open, write, issueLogOpen });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Feedback</h2>
        <p className="text-sm text-slate-600">
          {headerNote}
          {!open && issueLogOpen ? (
            <>
              {" "}
              <Link href="/issues" className="text-blue-700 underline">
                Issue log
              </Link>
            </>
          ) : null}
        </p>
      </div>

      {params.saved === "1" && <PortalBanner tone="success">Saved.</PortalBanner>}
      {params.response_saved === "1" && admin && (
        <PortalBanner tone="success">Response saved.</PortalBanner>
      )}
      <PortalQueryBanner code={params.error} messages={PORTAL_FEEDBACK_ERRORS} />

      <Card title={`Feedback at a Glance (${entries.length})`}>
        <p className="mb-2 text-xs text-slate-500">
          Newest first. Use <strong>View</strong> for full comment and PI reply.
        </p>
        <CaptainFeedbackGlanceTable entries={entries} />
      </Card>

      {open && write && (
        <section className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <h3 className="mb-1.5 text-sm font-semibold text-slate-900">Submit Feedback</h3>
          <form action={submitCaptainFeedbackAction} className="space-y-2">
            <div className="flex flex-wrap items-end gap-x-2 gap-y-1.5">
              <label className="min-w-[9rem]">
                <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Topic *
                </span>
                <select name="category" defaultValue="portal" required className={fieldClass}>
                  {CAPTAIN_FEEDBACK_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="min-w-[8rem]">
                <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Day
                </span>
                <select name="event_date" defaultValue="" className={fieldClass}>
                  <option value="">General</option>
                  {dates.map((d) => (
                    <option key={d} value={d}>
                      {formatEventDate(d)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="w-[4.5rem]">
                <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Rating
                </span>
                <select name="portal_rating" defaultValue="" className={fieldClass}>
                  <option value="">—</option>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={String(n)}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="min-w-[7rem] flex-1">
                <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Name
                </span>
                <input name="name" className={fieldClass} placeholder="Optional" />
              </label>
              <label className="min-w-[9rem] flex-[1.2]">
                <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Email
                </span>
                <input name="email" type="email" className={fieldClass} placeholder="Optional" />
              </label>
            </div>
            <div className="flex flex-wrap items-end gap-x-2 gap-y-1.5">
              <label className="min-w-[12rem] flex-1">
                <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Comments *
                </span>
                <textarea
                  name="comments"
                  required
                  rows={2}
                  placeholder="Training gaps, portal features, signage…"
                  className={fieldClass}
                />
              </label>
              <FeedbackSubmitButton />
            </div>
          </form>
        </section>
      )}

      {entries.length > 0 && (
        <Card title={`Manage — Feedback (${entries.length})`}>
          <CaptainFeedbackManageList entries={entries} isAdmin={admin} />
        </Card>
      )}
    </div>
  );
}
