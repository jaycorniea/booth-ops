import {
  ADMIN_DAY_CAPTAIN_KEY,
  GUEST_DAY_CAPTAIN_KEY,
  isAdminCaptainKey,
  type DayCaptainOption,
} from "@/lib/captain-ip-mapping-keys";
import { formatEventDate } from "@/lib/event-dates";

export function DayCaptainSelect({
  options,
  name = "day_captain",
  defaultValue,
  required = true,
  groupByDate = false,
  className = "mt-1 w-full rounded border px-2 py-1.5 text-sm",
  onChange,
}: {
  options: DayCaptainOption[];
  name?: string;
  defaultValue?: string;
  required?: boolean;
  groupByDate?: boolean;
  className?: string;
  onChange?: (value: string) => void;
}) {
  if (!groupByDate) {
    return (
      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        className={className}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  const adminOptions = options.filter((option) => isAdminCaptainKey(option.key));
  const guestOptions = options.filter((option) => option.key === GUEST_DAY_CAPTAIN_KEY);
  const rosterOptions = options.filter(
    (option) => !isAdminCaptainKey(option.key) && option.key !== GUEST_DAY_CAPTAIN_KEY
  );
  const byDate = new Map<string, DayCaptainOption[]>();
  for (const option of rosterOptions) {
    const list = byDate.get(option.event_date) ?? [];
    list.push(option);
    byDate.set(option.event_date, list);
  }

  return (
    <select
      name={name}
      required={required}
      defaultValue={defaultValue}
      className={className}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    >
      {adminOptions.map((option) => (
        <option key={option.key} value={option.key}>
          {option.label}
        </option>
      ))}
      {guestOptions.map((option) => (
        <option key={option.key} value={option.key}>
          {option.label}
        </option>
      ))}
      {[...byDate.entries()].map(([eventDate, dateOptions]) => (
        <optgroup key={eventDate} label={formatEventDate(eventDate)}>
          {dateOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}