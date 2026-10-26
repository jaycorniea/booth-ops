import { StoplightDot } from "@/components/StoplightDot";
import type { OnCallCoverageSummary } from "@/lib/on-call-matcher";
import {
  FILL_BAR_TONE_CLASS,
  fillPercent,
  formatFillPercent,
  onCallBackupTone,
} from "@/lib/shift-fill";

function Stat({
  tone,
  label,
  count,
  total,
}: {
  tone: "green" | "yellow" | "red";
  label: string;
  count: number;
  total: number;
}) {
  const percent = fillPercent(count, total);
  const ariaLabel = `${label} backup coverage: ${count} of ${total} shifts (${formatFillPercent(percent)})`;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums text-slate-800"
      title={ariaLabel}
      aria-label={ariaLabel}
    >
      <StoplightDot tone={tone} size="sm" />
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span>
        {count}/{total}
      </span>
      <span className="text-xs font-normal text-slate-500">({formatFillPercent(percent)})</span>
    </span>
  );
}

export function OnCallCoverageBar({ summary }: { summary: OnCallCoverageSummary }) {
  const { total, withTwoOrMore, withOne, withZero } = summary;
  if (total <= 0) return null;

  const greenW = (withTwoOrMore / total) * 100;
  const yellowW = (withOne / total) * 100;
  const redW = (withZero / total) * 100;
  const ariaLabel = `On-call coverage: ${withTwoOrMore} of ${total} shifts with at least two backups, ${withOne} with one, ${withZero} with none`;

  return (
    <div className="space-y-2" title={ariaLabel} aria-label={ariaLabel}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Stat tone="green" label="≥2" count={withTwoOrMore} total={total} />
        <Stat tone="yellow" label="1" count={withOne} total={total} />
        <Stat tone="red" label="0" count={withZero} total={total} />
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        {greenW > 0 && (
          <div className={`h-full ${FILL_BAR_TONE_CLASS.green}`} style={{ width: `${greenW}%` }} />
        )}
        {yellowW > 0 && (
          <div className={`h-full ${FILL_BAR_TONE_CLASS.yellow}`} style={{ width: `${yellowW}%` }} />
        )}
        {redW > 0 && (
          <div className={`h-full ${FILL_BAR_TONE_CLASS.red}`} style={{ width: `${redW}%` }} />
        )}
      </div>
    </div>
  );
}
