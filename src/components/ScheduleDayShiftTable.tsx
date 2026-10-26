import type { Shift } from "@/lib/db";
import { ContactEmail, ContactPhone } from "@/components/ContactField";
import {
  SCHEDULE_CELL,
  SCHEDULE_HEAD,
  SCHEDULE_TABLE,
  ScheduleTableColGroup,
} from "@/components/schedule-table-styles";
import type { AuthRole } from "@/lib/auth-types";
import { VOLUNTEER_SLOT_LABEL, VOLUNTEER_SLOTS } from "@/lib/shift-slots";
import { hasVolunteer, UNASSIGNED_SLOT_TEXT_CLASS } from "@/lib/event-dates";
import {
  formatScheduleShiftLabel,
  scheduleVolunteerColumns,
} from "@/lib/schedule-display";
import { formatSchedulePersonName } from "@/lib/volunteer-display-name";

export function ScheduleDayShiftTable({
  shifts,
  role,
  allowContact = true,
  showContact = true,
}: {
  shifts: Shift[];
  role: AuthRole;
  allowContact?: boolean;
  showContact?: boolean;
}) {
  return (
    <table className={SCHEDULE_TABLE}>
      <ScheduleTableColGroup />
      <thead>
        <tr>
          <th className={`${SCHEDULE_HEAD} whitespace-nowrap`}>Shift</th>
          {VOLUNTEER_SLOTS.map((slot) => (
            <th key={slot} className={SCHEDULE_HEAD}>
              {VOLUNTEER_SLOT_LABEL[slot]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {shifts.map((shift) => (
          <tr key={shift.id}>
            <td className={`${SCHEDULE_CELL} font-medium text-slate-800 whitespace-nowrap`}>
              {formatScheduleShiftLabel(shift.shift_num)}
            </td>
            {scheduleVolunteerColumns(shift).map((col) => (
              <ScheduleVolunteerCell
                key={col.slot}
                name={col.name}
                phone={col.phone}
                email={col.email}
                role={role}
                allowContact={allowContact}
                showContact={showContact}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ScheduleVolunteerCell({
  name,
  phone,
  email,
  role,
  allowContact,
  showContact,
}: {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  role: AuthRole;
  allowContact: boolean;
  showContact: boolean;
}) {
  const open = !hasVolunteer(name);

  return (
    <td className={SCHEDULE_CELL}>
      {open ? (
        <span className={UNASSIGNED_SLOT_TEXT_CLASS}>Open</span>
      ) : (
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium text-slate-800 break-words">
            {formatSchedulePersonName(name ?? "", role)}
          </p>
          <ContactPhone
            phone={phone ?? ""}
            allowContact={allowContact}
            showContact={showContact}
            className="block truncate text-slate-600"
            emptyLabel=""
          />
          <ContactEmail
            email={email ?? ""}
            allowContact={allowContact}
            showContact={showContact}
            className="block truncate break-all text-slate-600"
            emptyLabel=""
          />
        </div>
      )}
    </td>
  );
}
