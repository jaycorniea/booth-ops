"use client";

import type { PortalActivityQuery } from "@/lib/portal-activity";
import { formatEventDate } from "@/lib/event-dates";
import { usePathname, useRouter } from "next/navigation";

export function PortalLogFilters({
  query,
  eventDates,
  people,
}: {
  query: PortalActivityQuery;
  eventDates: string[];
  people: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  function update(next: Partial<PortalActivityQuery>) {
    const merged: PortalActivityQuery = { ...query, ...next };
    const params = new URLSearchParams();
    params.set("mode", merged.mode);
    params.set("range", merged.range);
    params.set("kind", merged.kind);
    if (merged.mode === "history" && merged.captain) params.set("captain", merged.captain);
    if (merged.mode === "traffic" && merged.role !== "all") params.set("role", merged.role);
    if (merged.range === "event_day" && merged.eventDate) {
      params.set("event_date", merged.eventDate);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            query.mode === "history" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
          onClick={() => update({ mode: "history", range: query.mode === "history" ? query.range : "all" })}
        >
          Captain history
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            query.mode === "traffic" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
          onClick={() =>
            update({
              mode: "traffic",
              range: query.mode === "traffic" ? query.range : "7d",
              captain: null,
            })
          }
        >
          Traffic
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {query.mode === "history" ? (
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium uppercase text-slate-500">Person</span>
            <select
              className="min-w-[12rem] rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={query.captain ?? ""}
              onChange={(e) => update({ captain: e.target.value || null })}
            >
              <option value="">Choose…</option>
              {people.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium uppercase text-slate-500">When</span>
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
            value={query.range}
            onChange={(e) =>
              update({ range: e.target.value as PortalActivityQuery["range"] })
            }
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="all">All time</option>
            <option value="event_day">Event day</option>
          </select>
        </label>

        {query.range === "event_day" && (
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium uppercase text-slate-500">Event day</span>
            <select
              className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={query.eventDate ?? ""}
              onChange={(e) => update({ eventDate: e.target.value || null })}
            >
              {eventDates.map((iso) => (
                <option key={iso} value={iso}>
                  {formatEventDate(iso)}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium uppercase text-slate-500">Show</span>
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
            value={query.kind}
            onChange={(e) => update({ kind: e.target.value as PortalActivityQuery["kind"] })}
          >
            <option value="all">Views + updates</option>
            <option value="pages">Views only</option>
            <option value="changes">Updates only</option>
          </select>
        </label>
      </div>
    </div>
  );
}
