import {
  encodeAvailabilityFormValues,
  splitAvailability,
} from "./availability-form";
import { getEventDates } from "./event-dates";
import { formatPhoneDisplay } from "./phone-format";
import { formatVolunteerDisplayName } from "./volunteer-display-name";

export {
  availabilitySelectionFromStorage,
  encodeAvailabilityFormValues,
  mergeAvailabilityToggle,
  splitAvailability,
} from "./availability-form";

export function parseOnCallFormData(formData: FormData) {
  const dateValues = formData.getAll("available_dates").map(String);
  const shiftValues = formData.getAll("available_shifts").map(String);

  const available_dates = encodeAvailabilityFormValues(dateValues);
  const available_shifts = encodeAvailabilityFormValues(shiftValues);

  return {
    name: formatVolunteerDisplayName(String(formData.get("name") ?? "")),
    phone: formatPhoneDisplay(String(formData.get("phone") ?? "")),
    email: String(formData.get("email") ?? ""),
    availability: String(formData.get("availability") ?? ""),
    notice_minutes: Math.max(5, Number(formData.get("notice_minutes") ?? 45)),
    available_dates,
    available_shifts,
    bilingual: formData.get("bilingual") === "on" ? 1 : 0,
  };
}

export const EVENT_DATE_OPTIONS = getEventDates();