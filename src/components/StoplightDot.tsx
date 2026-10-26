import type { FillPercentTone } from "@/lib/shift-fill";

const TONE_STYLE: Record<FillPercentTone, string> = {
  green:
    "bg-[radial-gradient(circle_at_32%_28%,#bbf7d0_0%,#22c55e_45%,#15803d_100%)] shadow-[inset_0_-2px_3px_rgba(0,0,0,0.28),0_1px_2px_rgba(0,0,0,0.14)]",
  yellow:
    "bg-[radial-gradient(circle_at_32%_28%,#fef08a_0%,#facc15_45%,#ca8a04_100%)] shadow-[inset_0_-2px_3px_rgba(0,0,0,0.28),0_1px_2px_rgba(0,0,0,0.14)]",
  red:
    "bg-[radial-gradient(circle_at_32%_28%,#fecaca_0%,#ef4444_45%,#b91c1c_100%)] shadow-[inset_0_-2px_3px_rgba(0,0,0,0.28),0_1px_2px_rgba(0,0,0,0.14)]",
};

const SIZE_CLASS = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
} as const;

export function StoplightDot({
  tone,
  size = "md",
}: {
  tone: FillPercentTone;
  size?: keyof typeof SIZE_CLASS;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full ${SIZE_CLASS[size]} ${TONE_STYLE[tone]}`}
    />
  );
}