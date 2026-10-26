import type { ReactNode } from "react";
import { StatTile } from "@/components/KpiWidgets";
import type { DuringEventKpis } from "@/lib/kpi";

function pendingCardClass(pending: boolean): string {
  return pending ? "border-dashed opacity-75" : "";
}

function KpiGroup({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-base font-semibold text-slate-900">{title}</h4>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function DuringEventOperationsSection({
  kpis,
  pending,
  eventOpenDate,
}: {
  kpis: DuringEventKpis;
  pending: boolean;
  eventOpenDate?: string;
}) {
  void eventOpenDate;
  return (
    <KpiGroup title="Booth operations" subtitle={pending ? "Available once the booth is live" : undefined}>
      <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${pendingCardClass(pending)}`}>
        <StatTile label="Elapsed days" value={`${kpis.elapsedDays} / ${kpis.totalEventDays}`} />
        <StatTile label="Check-ins" value={kpis.checkIns} />
        <StatTile label="No-shows" value={kpis.noShows} />
        <StatTile label="Open issues" value={kpis.issuesOpen} />
      </div>
    </KpiGroup>
  );
}
