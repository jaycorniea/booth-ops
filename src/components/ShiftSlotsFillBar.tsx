import { StoplightFillTrack, StoplightPercent } from "@/components/StoplightFill";
import { fillSlotsAriaLabel } from "@/lib/shift-fill";

export function ShiftSlotsFillBar({
  filled,
  total,
  scope = "across all event days",
}: {
  filled: number;
  total: number;
  /** Shown in title/aria after the slot counts (e.g. "for this day"). */
  scope?: string;
}) {
  const description = fillSlotsAriaLabel(filled, total, scope);

  return (
    <div className="flex w-full items-center gap-3" title={description} aria-label={description}>
      <StoplightPercent filled={filled} total={total} />
      <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">
        {filled}/{total}
      </span>
      <StoplightFillTrack filled={filled} total={total} className="min-w-0 flex-1" />
    </div>
  );
}
