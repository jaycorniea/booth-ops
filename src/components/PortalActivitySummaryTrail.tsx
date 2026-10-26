import type { PortalActivitySummaryStop } from "@/lib/portal-activity";
import { portalLogKindChipClass } from "@/lib/portal-log-event-style";

export function PortalActivitySummaryTrail({
  stops,
  className = "",
}: {
  stops: PortalActivitySummaryStop[];
  className?: string;
}) {
  if (!stops.length) {
    return <span className={`text-slate-400 ${className}`}>—</span>;
  }

  const title = stops.map((stop) => stop.label).join(" → ");

  return (
    <span
      className={`flex min-w-0 items-center gap-1 overflow-hidden ${className}`}
      title={title}
    >
      {stops.map((stop, index) => (
        <span key={`${stop.kind}-${index}-${stop.label}`} className="flex min-w-0 items-center gap-1">
          {index > 0 && <span className="shrink-0 text-slate-300">→</span>}
          <span className={`min-w-0 truncate ${portalLogKindChipClass(stop.kind)}`}>
            {stop.label}
          </span>
        </span>
      ))}
    </span>
  );
}