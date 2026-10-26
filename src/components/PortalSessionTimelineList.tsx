"use client";

import type { AuthRole } from "@/lib/auth-types";
import { ROLE_LABELS } from "@/lib/auth-types";
import type {
  PortalActivityKind,
  PortalActivityRange,
  PortalActivitySessionView,
  PortalActivitySummaryStop,
  PortalTimelineEntry,
} from "@/lib/portal-activity";
import { formatPortalTimestampCompact } from "@/lib/portal-time";
import { parseUserAgent } from "@/lib/user-agent";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import {
  PORTAL_LOG_ACTIVITY_COUNT,
  PORTAL_LOG_ACTIVITY_HEADER,
  PORTAL_LOG_NAV_COUNT,
  PORTAL_LOG_NAV_HEADER,
} from "@/lib/portal-log-event-style";
import { PortalActivitySummaryTrail } from "./PortalActivitySummaryTrail";
import { PortalLogDisclosureMarker } from "./PortalLogDisclosureMarker";
import { PortalLogWhereCell } from "./PortalLogWhereCell";
import { PortalTimelineEventList } from "./PortalTimelineEventList";

function shortSessionId(id: string): string {
  return id.slice(0, 8);
}

const SESSION_GRID =
  "grid grid-cols-[1.5rem_9.5rem_minmax(8rem,10rem)_minmax(9rem,11rem)_minmax(10rem,1fr)_3rem_5rem] items-start gap-x-3";

export type PortalLogTimelineQuery = {
  range: PortalActivityRange;
  kind: PortalActivityKind;
  eventDate: string | null;
};

function whoPrimary(view: PortalActivitySessionView): string {
  const captain = view.captain_name?.trim();
  if (captain) return captain;
  const role = view.session.auth_role as AuthRole | null;
  return role ? (ROLE_LABELS[role] ?? role) : "Visitor";
}

function whoSecondary(view: PortalActivitySessionView): string {
  const captain = view.captain_name?.trim();
  const role = view.session.auth_role as AuthRole | null;
  if (captain && role) return ROLE_LABELS[role] ?? role;
  return "";
}

function SessionWhoCell({ view }: { view: PortalActivitySessionView }) {
  const primary = whoPrimary(view);
  const secondary = whoSecondary(view);
  return (
    <span className="block min-w-0 text-xs">
      <span className="font-medium text-slate-800">{primary}</span>
      {secondary ? <span className="block text-slate-500">{secondary}</span> : null}
    </span>
  );
}

function SessionRow({
  view,
  highlightSessionId,
  nested,
  defaultOpen,
  timelineQuery,
}: {
  view: PortalActivitySessionView;
  highlightSessionId?: string | null;
  nested: boolean;
  defaultOpen: boolean;
  timelineQuery: PortalLogTimelineQuery;
}) {
  const highlighted = highlightSessionId === view.session.id;
  const shouldOpen = defaultOpen || highlighted;
  const [timeline, setTimeline] = useState<PortalTimelineEntry[]>(view.timeline);
  const [summaryStops, setSummaryStops] = useState<PortalActivitySummaryStop[]>(
    view.summary_stops ?? []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(view.timeline.length > 0);
  const loadingRef = useRef(false);

  const loadTimeline = useCallback(async () => {
    if (loaded || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        session: view.session.id,
        range: timelineQuery.range,
        kind: timelineQuery.kind,
      });
      if (timelineQuery.eventDate) params.set("event_date", timelineQuery.eventDate);
      const res = await fetch(`/api/portal-log/session-timeline?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load timeline (${res.status})`);
      }
      const data = (await res.json()) as {
        timeline?: PortalTimelineEntry[];
        summary_stops?: PortalActivitySummaryStop[];
      };
      setTimeline(data.timeline ?? []);
      if (data.summary_stops) setSummaryStops(data.summary_stops);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timeline");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [loaded, timelineQuery.eventDate, timelineQuery.kind, timelineQuery.range, view.session.id]);

  const ua = parseUserAgent(view.session.user_agent);
  const ip = view.session.client_ip?.trim();

  return (
    <details
      className={`group/session ${nested ? "py-0" : "py-1"} ${highlighted ? "rounded-lg bg-blue-50/60 ring-1 ring-blue-200" : ""}`}
      open={shouldOpen || undefined}
      onToggle={(event) => {
        if (event.currentTarget.open) void loadTimeline();
      }}
    >
      <summary
        className={`${SESSION_GRID} cursor-pointer list-none ${nested ? "py-0.5" : "py-1.5"} marker:content-none [&::-webkit-details-marker]:hidden`}
      >
        <PortalLogDisclosureMarker groupName="session" />
        <span className="whitespace-nowrap pt-0.5 text-xs text-slate-500">
          {formatPortalTimestampCompact(view.session.started_at)}
        </span>
        <SessionWhoCell view={view} />
        <span className="pt-0.5">
          <PortalLogWhereCell view={view} ipOnly />
        </span>
        <PortalActivitySummaryTrail
          stops={summaryStops}
          className={nested ? "pt-0.5 text-xs" : "pt-0.5 text-sm"}
        />
        <span className={`${PORTAL_LOG_NAV_COUNT} pt-0.5 ${nested ? "text-xs" : ""}`}>
          {view.page_count}
        </span>
        <span className={`${PORTAL_LOG_ACTIVITY_COUNT} pt-0.5 ${nested ? "text-xs" : ""}`}>
          {view.change_count}
        </span>
      </summary>

      <div className="mb-2 ml-1 space-y-1.5 border-l border-slate-200 py-1 pl-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>
            Session{" "}
            <Link
              href={`/portal-log?session=${encodeURIComponent(view.session.id)}`}
              className="font-mono text-blue-700 underline"
            >
              {shortSessionId(view.session.id)}
            </Link>
          </span>
          {ip ? (
            <span>
              IP <span className="font-mono text-slate-700">{ip}</span>
            </span>
          ) : null}
          <span>Last seen {formatPortalTimestampCompact(view.session.last_seen_at)}</span>
          <span>
            {ua.device} · {ua.browser}
          </span>
        </div>
        {view.location_label && view.location_label !== "—" ? (
          <p className="text-xs text-slate-600">{view.location_label}</p>
        ) : null}
        {loading && !timeline.length ? (
          <p className="text-xs text-slate-500">Loading timeline…</p>
        ) : null}
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        {!loading && !error && timeline.length === 0 && loaded ? (
          <p className="text-xs text-slate-500">No matching events in this filter.</p>
        ) : null}
        {timeline.length > 0 ? <PortalTimelineEventList timeline={timeline} /> : null}
      </div>
    </details>
  );
}

export function PortalSessionTimelineList({
  sessions,
  highlightSessionId,
  nested = false,
  showHeader = false,
  defaultOpen = false,
  timelineQuery,
}: {
  sessions: PortalActivitySessionView[];
  highlightSessionId?: string | null;
  /** Nested under a day row — tighter padding. */
  nested?: boolean;
  /** Column headers (by-day view uses one header at top; grouped view per day). */
  showHeader?: boolean;
  defaultOpen?: boolean;
  timelineQuery: PortalLogTimelineQuery;
}) {
  if (!sessions.length) {
    return <p className="text-sm text-slate-500">No matching sessions in this window.</p>;
  }

  return (
    <div className={showHeader ? "overflow-x-auto" : undefined}>
      {showHeader ? (
        <div
          className={`${SESSION_GRID} border-b pb-1 text-xs font-medium uppercase text-slate-500`}
        >
          <span aria-hidden />
          <span>Started</span>
          <span>Who</span>
          <span>IP</span>
          <span>What</span>
          <span className={PORTAL_LOG_NAV_HEADER}>Nav</span>
          <span className={PORTAL_LOG_ACTIVITY_HEADER}>Activity</span>
        </div>
      ) : null}

      <div className="divide-y divide-slate-100">
        {sessions.map((view) => (
          <SessionRow
            key={view.session.id}
            view={view}
            highlightSessionId={highlightSessionId}
            nested={nested}
            defaultOpen={defaultOpen}
            timelineQuery={timelineQuery}
          />
        ))}
      </div>
    </div>
  );
}
