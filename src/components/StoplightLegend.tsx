import { StoplightDot } from "@/components/StoplightDot";
import { StoplightFillTrack, StoplightPercent } from "@/components/StoplightFill";
import { fillPercentThresholds } from "@/lib/shift-fill";

export function StoplightThresholdLegend({
  greenAt,
  yellowAt,
}: {
  greenAt?: number;
  yellowAt?: number;
}) {
  const live = fillPercentThresholds();
  const green = greenAt ?? live.green;
  const yellow = yellowAt ?? live.yellow;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
      <span className="inline-flex items-center gap-1.5">
        <StoplightDot tone="green" size="sm" />
        <span>≥{green}%</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <StoplightDot tone="yellow" size="sm" />
        <span>≥{yellow}%</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <StoplightDot tone="red" size="sm" />
        <span>&lt;{yellow}%</span>
      </span>
    </span>
  );
}
