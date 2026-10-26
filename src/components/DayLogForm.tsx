import { Btn } from "@/components/ui";
import type { Shift } from "@/lib/db";
import { formatEventDate, formatShiftLabel, hasVolunteer } from "@/lib/event-dates";
import { formatVolunteerDisplayName } from "@/lib/volunteer-display-name";

export function DayLogForm({
  date,
  shifts,
}: {
  date: string;
  shifts: Shift[];
  canWrite?: boolean;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{formatEventDate(date)}</h2>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {shifts.map((shift) => {
          const names = shift.volunteers
            .filter((v) => hasVolunteer(v.name))
            .map((v) => formatVolunteerDisplayName(v.name));
          return (
            <li key={shift.id} className="px-3 py-2 text-sm">
              <span className="font-medium">{formatShiftLabel(shift.shift_num)}</span>
              <span className="ml-2 text-slate-600">
                {names.length ? names.join(" · ") : "No volunteers yet"}
              </span>
              {shift.checked_in ? (
                <span className="ml-2 text-green-700">checked in</span>
              ) : null}
              {shift.no_show ? <span className="ml-2 text-red-700">no-show</span> : null}
            </li>
          );
        })}
      </ul>
      <Btn type="button" disabled>
        Clicker counts are not part of Booth Ops v1
      </Btn>
    </div>
  );
}
