import { Card } from "@/components/ui";
import {
  buildOnCallCoverageMatrix,
  matrixEventDateLabel,
  matrixShiftRowLabel,
  onCallCoverageKey,
} from "@/lib/on-call-matcher";
import { ON_CALL_CELL_TONE_CLASS, onCallBackupTone } from "@/lib/shift-fill";
import type { OnCallVolunteer } from "@/lib/db";

function cellTone(count: number): string {
  return ON_CALL_CELL_TONE_CLASS[onCallBackupTone(count)];
}

export function OnCallCoverageMatrix({ volunteers }: { volunteers: OnCallVolunteer[] }) {
  const matrix = buildOnCallCoverageMatrix(volunteers);

  return (
    <Card title="Coverage Matrix">
      <p className="mb-2 text-xs text-slate-500">
        Active pool per day/shift · green ≥2 · yellow 1 · red 0
      </p>
      <div className="overflow-x-auto">
        <table className="w-max border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 whitespace-nowrap border border-slate-300 bg-slate-100 px-1.5 py-1 text-left font-medium text-slate-600">
                Shift
              </th>
              {matrix.eventDates.map((eventDate) => (
                <th
                  key={eventDate}
                  title={eventDate}
                  className="whitespace-nowrap border border-slate-300 bg-slate-100 px-1.5 py-1 text-center font-medium text-slate-700"
                >
                  {matrixEventDateLabel(eventDate)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.shifts.map((shift) => (
              <tr key={shift.num}>
                <th
                  className="sticky left-0 z-10 whitespace-nowrap border border-slate-300 bg-white px-1.5 py-1 text-left font-medium text-slate-700"
                  title={shift.label}
                >
                  {matrixShiftRowLabel(shift)}
                </th>
                {matrix.eventDates.map((eventDate) => {
                  const count = matrix.counts[onCallCoverageKey(eventDate, shift.num)] ?? 0;
                  return (
                    <td
                      key={`${eventDate}-${shift.num}`}
                      className={`whitespace-nowrap border border-slate-300 px-1.5 py-1 text-center tabular-nums ${cellTone(count)}`}
                    >
                      {count}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}