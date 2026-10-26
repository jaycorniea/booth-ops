import { Card } from "@/components/ui";
import { getAuthRole } from "@/lib/auth";
import { CAPTAIN_MORE_NAV_LABEL } from "@/lib/captain-nav";
import { isCaptainFeedbackOpenForPortal, isIssueLogOpenForPortal } from "@/lib/portal-window-sim-server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CaptainMorePage() {
  const role = await getAuthRole();
  if (role !== "captain") {
    redirect("/");
  }

  const [feedbackOpen, issuesOpen] = await Promise.all([
    isCaptainFeedbackOpenForPortal(),
    isIssueLogOpenForPortal(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{CAPTAIN_MORE_NAV_LABEL}</h2>
        <p className="text-sm text-slate-600">
          Extra tools. Shift gaps still go to the coordinator — captains do not assign on-call from here.
        </p>
      </div>

      <Card title="Booth close-out">
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/day-log" className="font-medium text-blue-700 underline">
              Day log
            </Link>
            <span className="text-slate-500"> — per-shift clicker counts</span>
          </li>
          <li>
            <Link href="/more/add-volunteer" className="font-medium text-blue-700 underline">
              Add a volunteer
            </Link>
            <span className="text-slate-500"> — step-by-step Shift Sheet how-to</span>
          </li>
          <li>
            <Link href="/kpi" className="font-medium text-blue-700 underline">
              KPIs
            </Link>
            <span className="text-slate-500"> — read-only event readiness</span>
          </li>
          {issuesOpen ? (
            <li>
              <Link href="/issues" className="font-medium text-blue-700 underline">
                Issues
              </Link>
              <span className="text-slate-500"> — event-week incident log</span>
            </li>
          ) : null}
          {feedbackOpen ? (
            <li>
              <Link href="/feedback" className="font-medium text-blue-700 underline">
                Feedback
              </Link>
              <span className="text-slate-500"> — prep suggestions for the coordinator</span>
            </li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}
