import { StoplightFillTrack, StoplightPercent } from "@/components/StoplightFill";
import { extraVolunteerFillLabel } from "@/lib/shift-slots";
import { fillSlotsAriaLabel } from "@/lib/shift-fill";

export function ShiftSlotsFillBar({
  filled,
  total,
  extraCount = 0,
  scope = "across all event days",
}: {
  filled: number;
  total: number;
  /** Extra volunteers beyond the two official slots per shift. */
  extraCount?: number;
  /** Shown in title/aria after the slot counts (e.g. "for this day"). */
  scope?: string;
}) {
  const description = fillSlotsAriaLabel(filled, total, scope, extraCount);
  const extraLabel = extraVolunteerFillLabel(extraCount);

  return (
    <div className="flex w-full items-center gap-3" title={description} aria-label={description}>
      <StoplightPercent filled={filled} total={total} />
      <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">
        {filled}/{total}
      </span>
      {extraLabel ? (
        <span className="shrink-0 rounded-full border border-orange-300 bg-orange-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
          {extraLabel}
        </span>
      ) : null}
      <StoplightFillTrack filled={filled} total={total} className="min-w-0 flex-1" />
    </div>
  );
}
