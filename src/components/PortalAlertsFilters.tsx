"use client";

import type { PortalAlertsQuery, PortalAlertsSeverityFilter } from "@/lib/alerts";
import { usePathname, useRouter } from "next/navigation";

const OPTIONS: { value: PortalAlertsSeverityFilter; label: string }[] = [
  { value: "actionable", label: "Actionable (critical + high + watch)" },
  { value: "all", label: "All severities" },
  { value: "critical", label: "Critical only" },
  { value: "high", label: "High only" },
  { value: "watch", label: "Watch only" },
  { value: "info", label: "Info only" },
];

export function PortalAlertsFilters({ query }: { query: PortalAlertsQuery }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      <label className="text-sm">
        <span className="mb-1 block text-xs font-medium uppercase text-slate-500">Show</span>
        <select
          className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
          value={query.severity}
          onChange={(e) => {
            const params = new URLSearchParams();
            const value = e.target.value as PortalAlertsSeverityFilter;
            if (value !== "actionable") params.set("severity", value);
            const qs = params.toString();
            router.push(qs ? `${pathname}?${qs}` : pathname);
          }}
        >
          {OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}