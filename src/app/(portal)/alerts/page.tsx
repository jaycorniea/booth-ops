import { AdminLogNav } from "@/components/AdminLogNav";
import { PortalAlertsFilters } from "@/components/PortalAlertsFilters";
import { PortalAlertsList } from "@/components/PortalAlertsList";
import { ResetAlertsButton } from "@/components/ResetAlertsButton";
import { Card } from "@/components/ui";
import { isAdmin } from "@/lib/auth";
import {
  filterPortalAlerts,
  listPortalAlerts,
  parsePortalAlertsQuery,
  summarizePortalAlerts,
} from "@/lib/alerts";
import { centralDateString, PORTAL_TIME_ZONE_LABEL } from "@/lib/portal-time";
import { redirect } from "next/navigation";

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) {
    redirect("/?error=admin_required");
  }

  const params = await searchParams;
  const query = parsePortalAlertsQuery(params);
  const cleared = params.cleared === "1";
  const today = centralDateString();
  const allAlerts = await listPortalAlerts(today);
  const counts = summarizePortalAlerts(allAlerts);
  const alerts = filterPortalAlerts(allAlerts, query);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Alerts</h2>
          <p className="text-sm text-slate-600">
            <strong>Events only</strong> — stored alerts from the last 7 days (synced from audit log).
            Shift slot opened up, on-call volunteer left pool, signup, no-show. Times use{" "}
            {PORTAL_TIME_ZONE_LABEL}. Clearing alerts does not touch Portal log.
          </p>
          {cleared ? (
            <p className="mt-2 text-sm text-emerald-700">Alerts deleted. Portal log unchanged.</p>
          ) : null}
        </div>
        <ResetAlertsButton />
      </div>

      <AdminLogNav active="/alerts" />

      <PortalAlertsFilters query={query} />

      <Card title={`Alerts (${alerts.length})`}>
        <p className="mb-3 text-xs text-slate-500">
          <span className="mr-2 inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Critical — act now
          </span>
          <span className="mr-2 inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> High — today
          </span>
          <span className="mr-2 inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-yellow-400" /> Watch — plan
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-400" /> Info — awareness
          </span>
        </p>
        <PortalAlertsList alerts={alerts} counts={counts} />
      </Card>
    </div>
  );
}