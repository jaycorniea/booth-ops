import {
  formatAuditChangeSummary,
  formatAuditEntityType,
  formatFieldChange,
  parseAuditChanges,
} from "@/lib/audit-format";
import { NAV_METHOD_LABELS } from "@/lib/nav-log-constants";
import type { PortalTimelineEntryWithWho } from "@/lib/portal-activity";
import { formatPortalPath } from "@/lib/portal-path-labels";
import { formatPortalTimestampCompact } from "@/lib/portal-time";
import Link from "next/link";
import {
  PORTAL_LOG_KIND_LABEL,
  portalLogKindChipClass,
  portalLogKindRowClass,
} from "@/lib/portal-log-event-style";

function methodBadgeClass(method: string): string {
  switch (method) {
    case "entry":
      return "bg-violet-100 text-violet-800";
    case "link":
      return "bg-blue-100 text-blue-800";
    case "button":
      return "bg-indigo-100 text-indigo-800";
    case "typed_url":
      return "bg-amber-100 text-amber-800";
    case "history":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function operationBadge(operation: string): string {
  switch (operation) {
    case "create":
      return "bg-emerald-100 text-emerald-800";
    case "update":
      return "bg-blue-100 text-blue-800";
    case "delete":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function PortalTimelineEventList({
  timeline,
}: {
  timeline: PortalTimelineEntryWithWho[];
}) {
  if (timeline.length === 0) {
    return <p className="text-xs text-slate-500">No nav or activity in this day.</p>;
  }

  return (
    <ol className="space-y-1">
      {timeline.map((item) => {
        if (item.kind === "page") {
          const methodLabel = NAV_METHOD_LABELS[item.method] ?? item.method;
          return (
            <li
              key={`page-${item.id}`}
              className={`flex flex-wrap items-start gap-2 ${portalLogKindRowClass("page")}`}
            >
              <span className="whitespace-nowrap text-xs text-slate-500">
                {formatPortalTimestampCompact(item.created_at)}
              </span>
              {item.who ? (
                <span className="font-medium text-slate-700">{item.who}</span>
              ) : null}
              <span className={portalLogKindChipClass("page")}>{PORTAL_LOG_KIND_LABEL.page}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${methodBadgeClass(item.method)}`}
              >
                {methodLabel}
              </span>
              {item.path ? (
                <Link href={item.path} className="text-blue-700 underline">
                  {formatPortalPath(item.path)}
                </Link>
              ) : (
                <span>—</span>
              )}
            </li>
          );
        }

        const changes = parseAuditChanges(item.changes);
        const changeRows = Object.entries(changes);
        const preview = formatAuditChangeSummary(changes);

        return (
          <li key={`change-${item.id}`} className={portalLogKindRowClass("change")}>
            <div className="flex flex-wrap items-start gap-2">
              <span className="whitespace-nowrap text-xs text-slate-500">
                {formatPortalTimestampCompact(item.created_at)}
              </span>
              {item.who ? (
                <span className="font-medium text-slate-700">{item.who}</span>
              ) : null}
              <span className={portalLogKindChipClass("change")}>
                {PORTAL_LOG_KIND_LABEL.change}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-medium capitalize ${operationBadge(item.operation)}`}
              >
                {item.operation}
              </span>
              <span className="text-slate-700">
                {formatAuditEntityType(item.entity_type)} · {item.summary}
              </span>
            </div>
            {changeRows.length > 0 && (
              <div className="mt-1.5">
                <p className="text-xs text-amber-950">
                  {changeRows.length} field{changeRows.length === 1 ? "" : "s"}
                  {preview ? ` — ${preview}` : ""}
                </p>
                <ul className="mt-1 space-y-0.5 border-l border-amber-200 pl-3 text-xs text-slate-700">
                  {changeRows.map(([field, change]) => (
                    <li key={field}>
                      <span className="font-medium text-slate-500">{field}:</span>{" "}
                      {formatFieldChange(change)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
