import { formatVolunteerDisplayName } from "./volunteer-display-name";
import { formatPhoneDisplay } from "./phone-format";

export function parseDayCaptainFormData(formData: FormData) {
  return {
    name: formatVolunteerDisplayName(String(formData.get("name") ?? "")),
    phone: formatPhoneDisplay(String(formData.get("phone") ?? "")),
    email: String(formData.get("email") ?? ""),
    district: String(formData.get("district") ?? ""),
  };
}