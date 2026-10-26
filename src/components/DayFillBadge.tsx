import { StoplightPercent } from "@/components/StoplightFill";
import { fillSlotsAriaLabel } from "@/lib/shift-fill";

export function DayFillBadge({
  filled,
  total,
  scope,
}: {
  filled: number;
  total: number;
  scope?: string;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 shadow-sm"
      title={fillSlotsAriaLabel(filled, total, scope)}
      aria-label={fillSlotsAriaLabel(filled, total, scope)}
    >
      <StoplightPercent filled={filled} total={total} />
    </span>
  );
}
