import type { PortalHistoryDay } from "@/lib/portal-activity";
import { PortalTimelineEventList } from "./PortalTimelineEventList";

export function PortalLogHistoryList({
  who,
  ips,
  days,
  pageCount,
  changeCount,
}: {
  who: string;
  ips: string[];
  days: PortalHistoryDay[];
  pageCount: number;
  changeCount: number;
}) {
  if (!who) {
    return <p className="text-sm text-slate-500">Choose a person to see their views and updates.</p>;
  }

  if (!days.length) {
    return (
      <p className="text-sm text-slate-500">
        No views or updates for {who} in this window.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-500">
        <span className="font-medium text-slate-700">{who}</span>
        {ips.length ? <span> · {ips.join(" · ")}</span> : null}
        <span>
          {" "}
          · {days.length} day{days.length === 1 ? "" : "s"} · {pageCount} views · {changeCount}{" "}
          updates
        </span>
      </p>
      {days.map((day) => (
        <section key={day.day}>
          <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            {day.label}
          </h3>
          <PortalTimelineEventList timeline={day.entries} />
        </section>
      ))}
    </div>
  );
}
