import { AdminLogNav } from "@/components/AdminLogNav";
import { StoplightThresholdLegend } from "@/components/StoplightLegend";
import { DuringEventOperationsSection } from "@/components/DuringEventOperationsSection";
import { CoverageCard, ShiftSlotsHistoryChart, StatTile } from "@/components/KpiWidgets";
import { Card } from "@/components/ui";
import { isAdmin } from "@/lib/auth";
import { formatEventDate, getEventClose, getEventOpen } from "@/lib/event-dates";
import { getDataHygieneKpis } from "@/lib/data-hygiene";
import { getDuringEventKpis, getPreEventKpis } from "@/lib/kpi";
import { centralDateString } from "@/lib/portal-time";
import Link from "next/link";

export default async function KpiPage() {
  const today = centralDateString();
  const [admin, preEvent, duringEvent, hygiene] = await Promise.all([
    isAdmin(),
    getPreEventKpis(today),
    getDuringEventKpis(today),
    getDataHygieneKpis(),
  ]);

  const phaseLabel =
    preEvent.phase === "pre-event"
      ? `${preEvent.daysUntilOpen} days until opening`
      : preEvent.phase === "during-event"
        ? `Event week — day ${duringEvent.elapsedDays} of ${duringEvent.totalEventDays}`
        : "Post-event";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Key Performance Indicators (KPIs)</h2>
        <p className="text-sm text-slate-600">
          Readiness and operations metrics · {formatEventDate(today)} ({phaseLabel})
        </p>
      </div>

      {admin && <AdminLogNav active="/kpi" />}

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Leading up to the event</h3>
          <p className="text-sm text-slate-600">
            Staffing coverage before event week ({formatEventDate(getEventOpen())} – {formatEventDate(getEventClose())}).
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CoverageCard metric={preEvent.captains} />
          <CoverageCard metric={preEvent.shiftSlots} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Days until event opens" value={preEvent.daysUntilOpen} />
        </div>

        <Card title="Volunteer Recruitment">
          <ShiftSlotsHistoryChart history={preEvent.shiftSlotsHistory} />
        </Card>
      </section>

      <section className="space-y-4 border-t border-slate-200 pt-8">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Data hygiene</h3>
          <p className="text-sm text-slate-600">
            Contact completeness across deduplicated volunteer profiles (shifts and Day Captains).
            Spot gaps on{" "}
            <Link href="/volunteers" className="font-medium text-blue-700 underline">
              volunteer profiles
            </Link>
            ; edit phone and email on the shift{" "}
            <Link href="/schedule" className="font-medium text-blue-700 underline">
              rosters
            </Link>{" "}
            or Day Captain forms on each event day page.
          </p>
        </div>

        {hygiene.totalVolunteers === 0 ? (
          <Card title="Contact coverage">
            <p className="text-sm text-slate-500">No volunteer profiles yet.</p>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-600">Stoplight thresholds</span>
              <StoplightThresholdLegend />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <CoverageCard metric={hygiene.phone} />
              <CoverageCard metric={hygiene.email} />
              <CoverageCard metric={hygiene.reachable} />
              <CoverageCard metric={hygiene.complete} />
            </div>
          </>
        )}
      </section>

      <section className="space-y-4 border-t border-slate-200 pt-8">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">During the event</h3>
          <p className="text-sm text-slate-600">
            Booth impact and day-of execution — visitors, roster attendance, and issues.
            Populates as Day Captains submit EOD reports.
          </p>
        </div>

        <DuringEventOperationsSection
          kpis={duringEvent}
          pending={preEvent.phase === "pre-event"}
          eventOpenDate={getEventOpen()}
        />
      </section>
    </div>
  );
}