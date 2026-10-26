import type { PortalActorGroup } from "@/lib/portal-activity";
import { groupPortalSessionsByDay } from "@/lib/portal-activity";
import { formatPortalTimestampCompact } from "@/lib/portal-time";
import {
  PORTAL_LOG_ACTIVITY_COUNT,
  PORTAL_LOG_ACTIVITY_HEADER,
  PORTAL_LOG_NAV_COUNT,
  PORTAL_LOG_NAV_HEADER,
} from "@/lib/portal-log-event-style";
import { PortalLogDisclosureMarker } from "./PortalLogDisclosureMarker";
import { PortalSessionDayGroupList } from "./PortalSessionDayGroupList";
import type { PortalLogTimelineQuery } from "./PortalSessionTimelineList";

const GROUP_GRID =
  "grid grid-cols-[1.5rem_9.5rem_minmax(9rem,1.1fr)_3rem_3rem_5rem] items-center gap-x-3";

function GroupWhoCell({ label, subtitle }: { label: string; subtitle: string }) {
  return (
    <span className="block min-w-0 text-xs">
      <span className="font-medium text-slate-800">{label}</span>
      {subtitle ? <span className="block text-slate-500">{subtitle}</span> : null}
    </span>
  );
}

export function PortalActorGroupList({
  groups,
  highlightSessionId,
  timelineQuery,
}: {
  groups: PortalActorGroup[];
  highlightSessionId?: string | null;
  timelineQuery: PortalLogTimelineQuery;
}) {
  if (!groups.length) {
    return <p className="text-sm text-slate-500">No matching people in this window.</p>;
  }

  const highlightGroupKey = highlightSessionId
    ? groups.find((group) =>
        group.sessions.some((view) => view.session.id === highlightSessionId)
      )?.key
    : null;

  return (
    <div className="overflow-x-auto">
      <div className={`${GROUP_GRID} border-b pb-1 text-xs font-medium uppercase text-slate-500`}>
        <span aria-hidden />
        <span>Last Active</span>
        <span>Who</span>
        <span>Days</span>
        <span className={PORTAL_LOG_NAV_HEADER}>Nav</span>
        <span className={PORTAL_LOG_ACTIVITY_HEADER}>Activity</span>
      </div>

      <div className="divide-y divide-slate-100">
        {groups.map((group) => {
          const highlighted = highlightGroupKey === group.key;
          const dayCount = groupPortalSessionsByDay(group.sessions).length;

          return (
            <details
              key={group.key}
              className={`group/actor py-1 ${highlighted ? "rounded-lg bg-blue-50/60 ring-1 ring-blue-200" : ""}`}
              open={highlighted || undefined}
            >
              <summary
                className={`${GROUP_GRID} cursor-pointer list-none py-1.5 marker:content-none [&::-webkit-details-marker]:hidden`}
              >
                <PortalLogDisclosureMarker groupName="actor" />
                <span className="whitespace-nowrap text-xs text-slate-500">
                  {formatPortalTimestampCompact(group.last_seen_at)}
                </span>
                <GroupWhoCell label={group.label} subtitle={group.subtitle} />
                <span className="tabular-nums text-slate-700">{dayCount}</span>
                <span className={PORTAL_LOG_NAV_COUNT}>{group.page_count}</span>
                <span className={PORTAL_LOG_ACTIVITY_COUNT}>{group.change_count}</span>
              </summary>

              <div className="mb-2 ml-1 border-l border-slate-200 pl-3">
                <PortalSessionDayGroupList
                  sessions={group.sessions}
                  highlightSessionId={highlightSessionId}
                  timelineQuery={timelineQuery}
                />
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
