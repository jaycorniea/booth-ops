import {
  buildDayActivitySummary,
  groupPortalSessionsByDay,
  type PortalActivitySessionView,
} from "@/lib/portal-activity";
import { formatPortalTimestampCompact } from "@/lib/portal-time";
import {
  PORTAL_LOG_ACTIVITY_COUNT,
  PORTAL_LOG_NAV_COUNT,
} from "@/lib/portal-log-event-style";
import { PortalDayActivitySummary } from "./PortalDayActivitySummary";
import { PortalLogDisclosureMarker } from "./PortalLogDisclosureMarker";
import {
  PortalSessionTimelineList,
  type PortalLogTimelineQuery,
} from "./PortalSessionTimelineList";

const DAY_GRID =
  "grid grid-cols-[1.5rem_9.5rem_minmax(12rem,1fr)_3rem_5rem] items-start gap-x-3";

const SESSION_GRID =
  "grid grid-cols-[1.5rem_9.5rem_minmax(8rem,10rem)_minmax(9rem,11rem)_minmax(10rem,1fr)_3rem_5rem] items-start gap-x-3";

export function PortalSessionDayGroupList({
  sessions,
  highlightSessionId,
  showSessionWho = false,
  timelineQuery,
}: {
  sessions: PortalActivitySessionView[];
  highlightSessionId?: string | null;
  /** Who column on session rows (by-day view only). */
  showSessionWho?: boolean;
  timelineQuery: PortalLogTimelineQuery;
}) {
  const days = groupPortalSessionsByDay(sessions);

  if (!days.length) {
    return <p className="text-sm text-slate-500">No matching activity in this window.</p>;
  }

  const highlightDay = highlightSessionId
    ? days.find((day) =>
        day.sessions.some((view) => view.session.id === highlightSessionId)
      )?.day
    : null;

  return (
    <div className="divide-y divide-slate-100">
      {showSessionWho ? (
        <div
          className={`${SESSION_GRID} border-b pb-1 text-xs font-medium uppercase text-slate-500`}
        >
          <span aria-hidden />
          <span>Started</span>
          <span>Who</span>
          <span>IP</span>
          <span>What</span>
          <span className={PORTAL_LOG_NAV_COUNT}>Nav</span>
          <span className={PORTAL_LOG_ACTIVITY_COUNT}>Activity</span>
        </div>
      ) : null}
      {days.map((day) => {
        const highlighted = highlightDay === day.day;
        const daySummary = buildDayActivitySummary(day.sessions);
        const singleSession = day.session_count === 1;

        return (
          <details
            key={day.day}
            className={`group/day py-0 ${highlighted ? "rounded-lg bg-blue-50/40 ring-1 ring-blue-200" : ""}`}
            open={highlighted || undefined}
          >
            <summary
              className={`${DAY_GRID} cursor-pointer list-none py-1 marker:content-none [&::-webkit-details-marker]:hidden`}
            >
              <PortalLogDisclosureMarker groupName="day" />
              <span className="pt-0.5 text-xs font-medium text-slate-800">
                <span className="block">{day.label}</span>
                <span className="block font-normal text-slate-500">
                  {day.session_count} session{day.session_count === 1 ? "" : "s"} ·{" "}
                  {formatPortalTimestampCompact(day.first_started_at)} –{" "}
                  {formatPortalTimestampCompact(day.last_seen_at)}
                </span>
              </span>
              <PortalDayActivitySummary nav={daySummary.nav} activity={daySummary.activity} />
              <span className={`${PORTAL_LOG_NAV_COUNT} pt-0.5 text-xs`}>{day.page_count}</span>
              <span className={`${PORTAL_LOG_ACTIVITY_COUNT} pt-0.5 text-xs`}>
                {day.change_count}
              </span>
            </summary>

            <div className="mb-1 ml-1 border-l border-slate-200 pl-3">
              <PortalSessionTimelineList
                sessions={day.sessions}
                highlightSessionId={highlightSessionId}
                nested
                showHeader={!showSessionWho}
                defaultOpen={singleSession && highlighted}
                timelineQuery={timelineQuery}
              />
            </div>
          </details>
        );
      })}
    </div>
  );
}
