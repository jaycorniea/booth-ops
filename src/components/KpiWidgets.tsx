import { StoplightDot } from "@/components/StoplightDot";
import { StoplightFillTrack } from "@/components/StoplightFill";
import type { CoverageMetric, ShiftSlotsHistorySummary } from "@/lib/kpi";
import { formatEventDate } from "@/lib/event-dates";
import { fillPercentTone, fillSlotsAriaLabel } from "@/lib/shift-fill";

export function CoverageCard({ metric }: { metric: CoverageMetric }) {
  const tone = fillPercentTone(metric.percent);
  const ariaLabel = fillSlotsAriaLabel(metric.filled, metric.total, metric.label);

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      title={ariaLabel}
      aria-label={ariaLabel}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{metric.label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-3xl font-bold tabular-nums text-slate-900">{metric.percent}%</p>
        <StoplightDot tone={tone} size="md" />
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {metric.filled} / {metric.total}
      </p>
      {metric.detail && <p className="mt-2 text-xs text-slate-500">{metric.detail}</p>}
      <StoplightFillTrack
        filled={metric.filled}
        total={metric.total}
        className="mt-3"
      />
    </div>
  );
}

function shortChartDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
}

export function ShiftSlotsHistoryChart({ history }: { history: ShiftSlotsHistorySummary }) {
  const { daily, auditChangeCount } = history;

  if (daily.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No roster change history yet — assign shift volunteers to build the chart.
      </p>
    );
  }

  const chartHeight = 220;
  const chartWidth = Math.max(daily.length * 36, 480);
  const padding = { top: 20, right: 36, bottom: 28, left: 36 };
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const plotWidth = chartWidth - padding.left - padding.right;
  // Band layout: each day owns an equal slot so bars stay inside the plot (not on the axes).
  const band = plotWidth / Math.max(daily.length, 1);
  const barWidth = Math.min(28, Math.max(4, band * 0.7));
  const labelStride = daily.length > 14 ? 3 : daily.length > 8 ? 2 : 1;

  const latest = daily[daily.length - 1];
  const target = latest.total;
  const scaleMax = Math.max(target, 1);

  const axisX = padding.left;
  const baselineY = padding.top + plotHeight;
  const yFor = (count: number) => baselineY - (count / scaleMax) * plotHeight;
  const targetY = yFor(target);
  const currentY = yFor(latest.filled);
  const yTicks = [0, Math.round(scaleMax / 2), scaleMax];

  const points = daily.map((row, index) => {
    // Center each bar in its band — first bar no longer sits on (and bleeds past) the y-axis.
    const x = padding.left + band * index + band / 2;
    const barH = (row.filled / scaleMax) * plotHeight;
    const y = padding.top + plotHeight - barH;
    return { row, x, y, barH, index };
  });

  return (
    <div className="max-w-full space-y-1.5 overflow-x-auto">
      <p className="text-[11px] text-slate-500">
        {latest.filled}/{latest.total} volunteers · {auditChangeCount} audited{" "}
        {auditChangeCount === 1 ? "change" : "changes"} · quiet days repeat prior count
      </p>

      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="h-[14rem] w-full min-h-[12rem] text-slate-600 sm:h-[16rem]"
        role="img"
        aria-label={fillSlotsAriaLabel(latest.filled, latest.total, "recruited")}
      >
        <line x1={axisX} x2={axisX} y1={padding.top} y2={baselineY} stroke="#cbd5e1" strokeWidth={1} />
        <line
          x1={axisX}
          x2={chartWidth - padding.right}
          y1={baselineY}
          y2={baselineY}
          stroke="#cbd5e1"
          strokeWidth={1}
        />

        {yTicks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line
                x1={axisX}
                x2={chartWidth - padding.right}
                y1={y}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
              <text x={axisX - 4} y={y + 3} textAnchor="end" fontSize={11} fill="#64748b">
                {tick}
              </text>
            </g>
          );
        })}

        <line
          x1={axisX}
          x2={chartWidth - padding.right}
          y1={targetY}
          y2={targetY}
          stroke="#b91c1c"
          strokeWidth={2}
        />
        <text x={chartWidth - padding.right} y={targetY - 3} textAnchor="end" fontSize={11} fill="#b91c1c">
          Target ({target})
        </text>

        {latest.filled < target && (
          <>
            <line
              x1={axisX}
              x2={chartWidth - padding.right}
              y1={currentY}
              y2={currentY}
              stroke="#0f172a"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <text x={chartWidth - padding.right} y={currentY - 3} textAnchor="end" fontSize={11} fill="#334155">
              Now ({latest.filled})
            </text>
          </>
        )}

        <text
          x={12}
          y={padding.top + plotHeight / 2}
          textAnchor="middle"
          fontSize={11}
          fill="#94a3b8"
          transform={`rotate(-90 12 ${padding.top + plotHeight / 2})`}
        >
          Slots
        </text>

        {points.map(({ row, x, y, barH, index }) => (
          <g key={row.snapshotDate}>
            <title>
              {formatEventDate(row.snapshotDate)}: {row.filled}/{row.total} ({row.percent}%)
              {row.changes > 0 ? ` · ${row.changes} roster change${row.changes === 1 ? "" : "s"}` : " · no roster changes"}
            </title>
            <rect
              x={x - barWidth / 2}
              y={y}
              width={barWidth}
              height={Math.max(barH, row.filled > 0 ? 2 : 0)}
              rx={3}
              fill="#5b7c99"
            />
            {index % labelStride === 0 || index === daily.length - 1 ? (
              <text x={x} y={chartHeight - 8} textAnchor="middle" fontSize={10} fill="#64748b">
                {shortChartDate(row.snapshotDate)}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  pending = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  pending?: boolean;
}) {
  return (
    <div
      className={
        pending
          ? "rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-3 opacity-75"
          : "rounded-lg bg-slate-50 px-3 py-3"
      }
    >
      <p className={`text-xs ${pending ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
      <p
        className={`text-2xl font-semibold tabular-nums ${
          pending ? "text-slate-400" : "text-slate-900"
        }`}
      >
        {pending ? "—" : value}
      </p>
      {hint && (
        <p className={`mt-1 text-xs ${pending ? "text-slate-400" : "text-slate-500"}`}>{hint}</p>
      )}
    </div>
  );
}