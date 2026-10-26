import { DayLogForm } from "@/components/DayLogForm";
import { Card } from "@/components/ui";
import { canWriteDayLog, getAuthRole } from "@/lib/auth";
import { formatEventDate, getEventDates } from "@/lib/event-dates";
import { getShiftsForDate } from "@/lib/db";
import { centralDateString } from "@/lib/portal-time";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DayLogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const eventDates = getEventDates();
  const today = centralDateString();
  const requested = params.date?.trim() ?? "";
  const date = eventDates.includes(requested)
    ? requested
    : eventDates.includes(today)
      ? today
      : eventDates[0];
  if (requested && requested !== date) {
    redirect(`/day-log?date=${date}`);
  }

  const [shifts, canWrite] = await Promise.all([getShiftsForDate(date), canWriteDayLog()]);
  void getAuthRole;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Day log</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Shift roster snapshot for {formatEventDate(date)}.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {eventDates.map((d) => {
          const active = d === date;
          return (
            <Link
              key={d}
              href={`/day-log?date=${d}`}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                active
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {formatEventDate(d)}
            </Link>
          );
        })}
      </div>

      <Card>
        <DayLogForm date={date} shifts={shifts} canWrite={canWrite} />
      </Card>
    </div>
  );
}
