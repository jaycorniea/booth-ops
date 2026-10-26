import { getCoverageTightenDate } from "./event-dates";
import { centralDateString } from "./portal-time";

/** July planning band — enough signal without panicking over every empty slot. */
export const FILL_PERCENT_GREEN_PLANNING = 80;
export const FILL_PERCENT_YELLOW_PLANNING = 50;

/** Week-before-open band — almost every slot filled. */
export const FILL_PERCENT_GREEN_TIGHT = 99;
export const FILL_PERCENT_YELLOW_TIGHT = 95;

/** Live cutoffs (tight from 7 days before event open). Prefer {@link fillPercentThresholds}. */
export const FILL_PERCENT_GREEN = FILL_PERCENT_GREEN_TIGHT;
export const FILL_PERCENT_YELLOW = FILL_PERCENT_YELLOW_TIGHT;

export function fillPercentThresholds(asOf = new Date()): { green: number; yellow: number } {
  const day = centralDateString(asOf);
  if (day >= getCoverageTightenDate()) {
    return { green: FILL_PERCENT_GREEN_TIGHT, yellow: FILL_PERCENT_YELLOW_TIGHT };
  }
  return { green: FILL_PERCENT_GREEN_PLANNING, yellow: FILL_PERCENT_YELLOW_PLANNING };
}

export type FillPercentTone = "green" | "yellow" | "red";

/** Flat bar fills — mid-tones aligned with StoplightDot gradients (yellow-400, not amber). */
export const FILL_BAR_TONE_CLASS: Record<FillPercentTone, string> = {
  green: "bg-green-600",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
};

export function fillPercent(filled: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((filled / total) * 100);
}

export function fillPercentTone(percent: number, asOf = new Date()): FillPercentTone {
  const { green, yellow } = fillPercentThresholds(asOf);
  if (percent >= green) return "green";
  if (percent >= yellow) return "yellow";
  return "red";
}

export function formatFillPercent(percent: number): string {
  return `${Math.round(percent)}%`;
}

/** Accessible label: percent, fraction, optional scope (e.g. "for this day"). */
export function fillSlotsAriaLabel(
  filled: number,
  total: number,
  scope?: string,
  extraCount = 0
): string {
  const percent = fillPercent(filled, total);
  const scopeSuffix = scope ? ` ${scope}` : "";
  const extra = extraCount > 0 ? `, plus ${extraCount} extra` : "";
  return `${formatFillPercent(percent)} of volunteer slots filled (${filled} of ${total}${extra})${scopeSuffix}`;
}