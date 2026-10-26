import {
  daysUntilEventOpen,
  eventDayNumber,
  getEventDates,
  getEventPhase,
} from "@/lib/event-dates";
import { centralDateString } from "@/lib/portal-time";

export function EventCountdown({ className = "" }: { className?: string }) {
  const today = centralDateString();
  const phase = getEventPhase(today);
  const totalEventDays = getEventDates().length;
  const shell = `shrink-0 rounded-lg border px-3 py-1.5 ${className}`.trim();

  if (phase === "post-event") {
    return (
      <div className={`${shell} border-slate-200 bg-slate-50 text-xs text-slate-600`}>
        Booth closed
      </div>
    );
  }

  if (phase === "during-event") {
    const dayNum = eventDayNumber(today);
    return (
      <div className={`${shell} border-green-200 bg-green-50`}>
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-2xl font-bold tabular-nums leading-none text-green-900">{dayNum}</span>
          <span className="text-xs font-medium text-green-800">of {totalEventDays} · open today</span>
        </div>
      </div>
    );
  }

  const days = daysUntilEventOpen(today);

  return (
    <div className={`${shell} border-blue-100 bg-blue-50/90`}>
      <div className="flex items-baseline gap-1.5 whitespace-nowrap">
        <span className="text-2xl font-bold tabular-nums leading-none text-blue-900">{days}</span>
        <span className="text-xs font-medium text-blue-800">
          {days === 1 ? "day to open" : "days to open"}
        </span>
      </div>
    </div>
  );
}