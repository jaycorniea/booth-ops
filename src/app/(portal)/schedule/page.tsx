import { ScheduleDayShiftTable } from "@/components/ScheduleDayShiftTable";
import { formatEventDate, getEventDates } from "@/lib/event-dates";
import { getShiftsForDate } from "@/lib/db";
import { canSeeContact, getAuthRole } from "@/lib/auth";

export default async function SchedulePage() {
  const [role, contact] = await Promise.all([getAuthRole(), canSeeContact()]);
  const dates = getEventDates();
  const days = await Promise.all(
    dates.map(async (date) => ({
      date,
      shifts: await getShiftsForDate(date),
    }))
  );
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Schedule</h1>
      {days.map(({ date, shifts }) => (
        <section key={date} className="space-y-2">
          <h2 className="text-lg font-semibold">{formatEventDate(date)}</h2>
          <ScheduleDayShiftTable
            shifts={shifts}
            role={role ?? "viewer"}
            allowContact={contact}
          />
        </section>
      ))}
    </div>
  );
}
