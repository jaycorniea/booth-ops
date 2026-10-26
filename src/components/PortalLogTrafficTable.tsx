import type { PortalActivitySessionView } from "@/lib/portal-activity";
import {
  formatPortalSessionWhere,
  portalSessionWhoPrimary,
  sessionActivityStops,
} from "@/lib/portal-activity";
import { formatPortalTimestampCompact } from "@/lib/portal-time";
import {
  PORTAL_LOG_ACTIVITY_COUNT,
  PORTAL_LOG_ACTIVITY_HEADER,
  PORTAL_LOG_NAV_COUNT,
  PORTAL_LOG_NAV_HEADER,
} from "@/lib/portal-log-event-style";
import { PortalActivitySummaryTrail } from "./PortalActivitySummaryTrail";

const GRID =
  "grid grid-cols-[6.5rem_9rem_minmax(7rem,0.8fr)_2.5rem_2.5rem_minmax(10rem,1.4fr)] items-center gap-x-3";

export function PortalLogTrafficTable({
  sessions,
}: {
  sessions: PortalActivitySessionView[];
}) {
  if (!sessions.length) {
    return <p className="text-sm text-slate-500">No traffic in this window.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className={`${GRID} border-b pb-1 text-xs font-medium uppercase text-slate-500`}>
        <span>When</span>
        <span>Who</span>
        <span>IP</span>
        <span className={PORTAL_LOG_NAV_HEADER}>View</span>
        <span className={PORTAL_LOG_ACTIVITY_HEADER}>Edit</span>
        <span>What</span>
      </div>
      <div className="divide-y divide-slate-100">
        {sessions.map((view) => (
          <div key={view.session.id} className={`${GRID} py-1.5 text-xs`}>
            <span className="whitespace-nowrap text-slate-500">
              {formatPortalTimestampCompact(view.session.last_seen_at)}
            </span>
            <span className="min-w-0 truncate font-medium text-slate-800">
              {portalSessionWhoPrimary(view)}
            </span>
            <span className="min-w-0 truncate font-mono text-slate-600">
              {formatPortalSessionWhere(view) || "—"}
            </span>
            <span className={PORTAL_LOG_NAV_COUNT}>{view.page_count}</span>
            <span className={PORTAL_LOG_ACTIVITY_COUNT}>{view.change_count}</span>
            <PortalActivitySummaryTrail stops={sessionActivityStops(view, 4)} />
          </div>
        ))}
      </div>
    </div>
  );
}
