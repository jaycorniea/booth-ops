import { StoplightDot } from "@/components/StoplightDot";
import {
  FILL_BAR_TONE_CLASS,
  fillPercent,
  fillPercentTone,
  formatFillPercent,
} from "@/lib/shift-fill";

/** Thin progress track — pair with a parent that has `aria-label` (dot + % elsewhere). */
export function StoplightFillTrack({
  filled,
  total,
  className = "",
}: {
  filled: number;
  total: number;
  className?: string;
}) {
  const percent = fillPercent(filled, total);
  const tone = fillPercentTone(percent);

  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-slate-200 ${className}`}
      aria-hidden="true"
    >
      <div
        className={`h-full rounded-full transition-[width] ${FILL_BAR_TONE_CLASS[tone]}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

/** Dot + bold % — decorative dot is aria-hidden; parent should set aria-label. */
export function StoplightPercent({
  filled,
  total,
  size = "md",
}: {
  filled: number;
  total: number;
  size?: "sm" | "md";
}) {
  const percent = fillPercent(filled, total);
  const tone = fillPercentTone(percent);
  const label = formatFillPercent(percent);

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      <span
        className={`font-bold tabular-nums text-black ${size === "sm" ? "text-xs" : "text-sm"}`}
      >
        {label}
      </span>
      <StoplightDot tone={tone} size={size} />
    </span>
  );
}
