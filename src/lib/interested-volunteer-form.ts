import { encodeAvailabilityFormValues } from "./availability-form";
import { formatPhoneDisplay } from "./phone-format";
import { formatVolunteerDisplayName } from "./volunteer-display-name";

export { EVENT_DATE_OPTIONS, splitAvailability } from "./on-call-form";

/** Interested pool forms do not collect ticket options. */
export function parseInterestedVolunteerFormData(formData: FormData) {
  const dateValues = formData.getAll("available_dates").map(String);
  const shiftValues = formData.getAll("available_shifts").map(String);

  const available_dates = encodeAvailabilityFormValues(dateValues);
  const available_shifts = encodeAvailabilityFormValues(shiftValues);

  return {
    name: formatVolunteerDisplayName(String(formData.get("name") ?? "")),
    phone: formatPhoneDisplay(String(formData.get("phone") ?? "")),
    email: String(formData.get("email") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    source: String(formData.get("source") ?? ""),
    available_dates,
    available_shifts,
    bilingual: formData.get("bilingual") === "on" ? 1 : 0,
    status: (String(formData.get("status") ?? "interested") as "interested" | "placed" | "withdrawn"),
  };
}