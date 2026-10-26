import {
  PORTAL_ALERT_SEVERITY_LABEL,
  type PortalAlert,
  type PortalAlertSeverity,
} from "@/lib/alerts";
import {
  ALERT_SEVERITY_BADGE,
  ALERT_SEVERITY_BORDER,
  ALERT_SEVERITY_DOT,
} from "@/lib/alert-style";
import { formatPortalTimestampCompact } from "@/lib/portal-time";
import Link from "next/link";

function SeveritySummary({
  counts,
}: {
  counts: Record<PortalAlertSeverity, number>;
}) {
  const items: PortalAlertSeverity[] = ["critical", "high", "watch", "info"];
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {items.map((severity) => (
        <span key={severity} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${ALERT_SEVERITY_DOT[severity]}`} />
          <span className="font-medium text-slate-700">{counts[severity]}</span>
          <span className="text-slate-500">{PORTAL_ALERT_SEVERITY_LABEL[severity]}</span>
        </span>
      ))}
    </div>
  );
}

export function PortalAlertsList({
  alerts,
  counts,
}: {
  alerts: PortalAlert[];
  counts: Record<PortalAlertSeverity, number>;
}) {
  if (!alerts.length) {
    return (
      <div className="space-y-3">
        <SeveritySummary counts={counts} />
        <p className="text-sm text-slate-500">No alerts match this filter. That is a good day.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SeveritySummary counts={counts} />
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className={`border-l-4 px-4 py-3 first:rounded-t-lg last:rounded-b-lg ${ALERT_SEVERITY_BORDER[alert.severity]}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${ALERT_SEVERITY_BADGE[alert.severity]}`}
                  >
                    {PORTAL_ALERT_SEVERITY_LABEL[alert.severity]}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatPortalTimestampCompact(alert.at)}
                  </span>
                </div>
                <p className="mt-1 font-medium text-slate-900">{alert.title}</p>
                <p className="mt-0.5 text-sm text-slate-600">{alert.detail}</p>
              </div>
              <Link
                href={alert.href}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-slate-50"
              >
                Open →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}