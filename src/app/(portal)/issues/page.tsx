import { IssueAdminResponsePanel } from "@/components/IssueAdminResponse";
import { PortalBanner, PortalQueryBanner } from "@/components/PortalBanner";
import { Btn, Card, Label, Select, Textarea } from "@/components/ui";
import { PORTAL_ISSUE_ERRORS } from "@/lib/portal-query-feedback";
import { addIssueAction, resolveIssueAction } from "@/lib/actions";
import { canWrite, isAdmin } from "@/lib/auth";
import { getEventDates, getShiftOptions, formatEventDate } from "@/lib/event-dates";
import { isIssueLogOpenForPortal } from "@/lib/portal-window-sim-server";
import { PORTAL_WINDOW_META } from "@/lib/portal-windows";
import { listIssues } from "@/lib/db";
import { formatPortalTimestampCompact } from "@/lib/portal-time";

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ response_saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const open = await isIssueLogOpenForPortal();
  const [issues, write, admin] = await Promise.all([listIssues(), canWrite(), isAdmin()]);
  const dates = getEventDates();
  const shifts = getShiftOptions();

  if (!open) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Issue log</h2>
          <p className="text-sm text-slate-600">Signage, visitors, volunteers, venue — feeds post-event debrief</p>
        </div>
        <Card title="Issue log opens soon">
          <p className="text-sm text-slate-700">
            Event-week issue logging unlocks in{" "}
            <strong>
              Window {PORTAL_WINDOW_META.c.code} — {PORTAL_WINDOW_META.c.label}
            </strong>{" "}
            (9pm Central eve of opening day). Until then, use{" "}
            <a href="/feedback" className="text-blue-700 underline">
              Day Captain feedback
            </a>{" "}
            for portal and prep suggestions.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Issue log</h2>
        <p className="text-sm text-slate-600">
          Signage, visitors, volunteers, venue — feeds post-event debrief. Coordinator responses are visible to
          all day captains on this page.
        </p>
      </div>

      {params.response_saved === "1" && admin && (
        <PortalBanner tone="success">
          <strong>Response saved</strong> — captains can see it on this page.
        </PortalBanner>
      )}
      <PortalQueryBanner code={params.error} messages={PORTAL_ISSUE_ERRORS} />

      {write && (
        <Card title="Log issue">
          <form action={addIssueAction} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Event date</Label>
                <Select name="event_date" required defaultValue={dates[0]}>
                  {dates.map((d) => (
                    <option key={d} value={d}>
                      {formatEventDate(d)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Shift</Label>
                <Select name="shift" defaultValue="">
                  <option value="">— Not shift-specific —</option>
                  {shifts.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select name="category" defaultValue="visitor">
                  <option value="signage">signage</option>
                  <option value="visitor">visitor</option>
                  <option value="volunteer">volunteer</option>
                  <option value="event">event</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea name="description" required />
            </div>
            <Btn type="submit">Add issue</Btn>
          </form>
        </Card>
      )}

      <Card title={`Issues (${issues.length})`}>
        {issues.length === 0 ? (
          <p className="text-sm text-slate-500">No issues logged.</p>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className={`rounded-lg border p-3 ${issue.resolved ? "border-slate-100 bg-slate-50 opacity-70" : "border-slate-200"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {formatEventDate(issue.event_date)}
                      {issue.shift && ` · ${issue.shift}`}
                      <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs">{issue.category}</span>
                      {issue.resolved ? (
                        <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">
                          resolved
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{issue.description}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatPortalTimestampCompact(issue.created_at)}
                    </p>
                    <IssueAdminResponsePanel issue={issue} isAdmin={admin} />
                  </div>
                  {!issue.resolved && write && (
                    <form action={resolveIssueAction.bind(null, issue.id)}>
                      <Btn type="submit" variant="secondary">
                        Resolve
                      </Btn>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}