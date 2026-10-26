import { ShiftVolunteerAutosaveRow } from "@/components/ShiftVolunteerAutosaveRow";
import { captainDayShowsCheckIn } from "@/lib/captain-day-view";
import { getPortalAsOf } from "@/lib/portal-window-sim-server";
import {
  officialSlotIndexes,
  volunteerSlotLabel,
  volunteerSlotVacancyLabel,
} from "@/lib/shift-slots";
import { formatShiftLabel, hasVolunteer, UNASSIGNED_SLOT_TEXT_CLASS } from "@/lib/event-dates";
import type { Shift } from "@/lib/db";
import { formatPhoneDisplay, phoneTelHref } from "@/lib/phone-format";
import { formatVolunteerDisplayName } from "@/lib/volunteer-display-name";
import {
  SHIFT_COL_CHECKIN,
  SHIFT_COL_NOSHOW,
  SHIFT_COL_SHIFT,
  SHIFT_COL_STACK,
  SHIFT_COL_W_CHECKIN,
  SHIFT_COL_W_NOSHOW,
  SHIFT_COL_W_SHIFT,
  SHIFT_COL_W_STACK,
  SHIFT_SPREADSHEET_CELL as CELL,
  SHIFT_SPREADSHEET_HEAD as HEAD,
  SHIFT_SPREADSHEET_TABLE,
} from "@/components/spreadsheet-table-styles";
import { SPREADSHEET_AUTOSAVE_HINT } from "@/lib/spreadsheet-autosave-copy";

export async function DayShiftVolunteerTable({
  shifts,
  eventDate,
  canWrite,
  allowContact,
}: {
  shifts: Shift[];
  eventDate: string;
  canWrite: boolean;
  allowContact: boolean;
}) {
  const asOf = await getPortalAsOf();
  const showCheckIn = captainDayShowsCheckIn(eventDate, asOf);
  const showNoShow = true;
  const slots = officialSlotIndexes();

  return (
    <div className="overflow-x-auto">
      {canWrite ? <p className="mb-2 text-xs text-slate-500">{SPREADSHEET_AUTOSAVE_HINT}</p> : null}
      <table className={SHIFT_SPREADSHEET_TABLE}>
        <colgroup>
          {showCheckIn ? <col className={SHIFT_COL_W_CHECKIN} /> : null}
          {showNoShow ? <col className={SHIFT_COL_W_NOSHOW} /> : null}
          <col className={SHIFT_COL_W_SHIFT} />
          {slots.map((slot) => (
            <col key={slot} className={SHIFT_COL_W_STACK} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {showCheckIn ? <th className={`${HEAD} ${SHIFT_COL_CHECKIN}`}>In</th> : null}
            {showNoShow ? <th className={`${HEAD} ${SHIFT_COL_NOSHOW}`}>NS</th> : null}
            <th className={`${HEAD} ${SHIFT_COL_SHIFT}`}>Shift</th>
            {slots.map((slot) => (
              <th key={slot} className={`${HEAD} ${SHIFT_COL_STACK}`}>
                {volunteerSlotLabel(slot)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shifts.map((shift) =>
            canWrite ? (
              <ShiftVolunteerAutosaveRow
                key={shift.id}
                shift={shift}
                shiftLabel={formatShiftLabel(shift.shift_num)}
                eventDate={eventDate}
                allowContact={allowContact}
                allowCheckIn={showCheckIn}
                allowNoShow={showNoShow}
              />
            ) : (
              <tr key={shift.id}>
                {showCheckIn ? (
                  <td className={`${CELL} ${SHIFT_COL_CHECKIN} text-center`}>
                    {shift.checked_in ? "✓" : ""}
                  </td>
                ) : null}
                {showNoShow ? (
                  <td className={`${CELL} ${SHIFT_COL_NOSHOW} text-center`}>
                    {shift.no_show ? "✓" : ""}
                  </td>
                ) : null}
                <td className={`${CELL} ${SHIFT_COL_SHIFT}`}>{formatShiftLabel(shift.shift_num)}</td>
                {slots.map((slotIndex) => {
                  const volunteer = shift.volunteers.find((v) => v.slot_index === slotIndex);
                  const name = volunteer?.name ?? "";
                  const empty = !hasVolunteer(name);
                  return (
                    <td key={slotIndex} className={`${CELL} ${SHIFT_COL_STACK}`}>
                      {empty ? (
                        <span className={UNASSIGNED_SLOT_TEXT_CLASS}>
                          {volunteerSlotVacancyLabel(slotIndex)}
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="block font-medium text-slate-900">
                            {formatVolunteerDisplayName(name)}
                          </span>
                          {allowContact && volunteer?.phone ? (
                            <a
                              href={phoneTelHref(volunteer.phone)}
                              className="block text-xs text-blue-700"
                            >
                              {formatPhoneDisplay(volunteer.phone)}
                            </a>
                          ) : null}
                          {allowContact && volunteer?.email ? (
                            <a
                              href={`mailto:${volunteer.email}`}
                              className="block text-xs text-blue-700"
                            >
                              {volunteer.email}
                            </a>
                          ) : null}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
