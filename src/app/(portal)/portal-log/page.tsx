import { AdminLogNav } from "@/components/AdminLogNav";
import { PortalLogFilters } from "@/components/PortalLogFilters";
import { PortalLogHistoryList } from "@/components/PortalLogHistoryList";
import { PortalLogTrafficTable } from "@/components/PortalLogTrafficTable";
import { Card } from "@/components/ui";
import { isAdmin } from "@/lib/auth";
import { getEventDates } from "@/lib/event-dates";
import {
  listPortalActivitySessions,
  listPortalLogPeople,
  listPortalPersonHistory,
  parsePortalActivityQuery,
} from "@/lib/portal-activity";
import { PORTAL_TIME_ZONE_LABEL } from "@/lib/portal-time";
import { redirect } from "next/navigation";

export default async function PortalLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) {
    redirect("/?error=admin_required");
  }

  const params = await searchParams;
  const query = parsePortalActivityQuery(params);
  const eventDates = getEventDates();
  const people = await listPortalLogPeople();

  if (query.mode === "history") {
    const history = await listPortalPersonHistory(query);
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Portal Log</h2>
          <p className="text-sm text-slate-600">
            One captain’s views and updates. Times are {PORTAL_TIME_ZONE_LABEL}.
          </p>
        </div>
        <AdminLogNav active="/portal-log" />
        <PortalLogFilters query={query} eventDates={eventDates} people={people} />
        <Card title={history.who || "Captain history"}>
          <PortalLogHistoryList
            who={history.who}
            ips={history.ips}
            days={history.days}
            pageCount={history.page_count}
            changeCount={history.change_count}
          />
        </Card>
      </div>
    );
  }

  const { sessions, truncated, limit } = await listPortalActivitySessions(query);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Portal Log</h2>
        <p className="text-sm text-slate-600">
          Traffic for this window. Times are {PORTAL_TIME_ZONE_LABEL}.
        </p>
      </div>
      <AdminLogNav active="/portal-log" />
      <PortalLogFilters query={query} eventDates={eventDates} people={people} />
      <Card title={`Traffic (${sessions.length})`}>
        {truncated ? (
          <p className="mb-2 text-xs text-amber-800">
            Showing the {limit} most recent sessions.
          </p>
        ) : null}
        <PortalLogTrafficTable sessions={sessions} />
      </Card>
    </div>
  );
}
