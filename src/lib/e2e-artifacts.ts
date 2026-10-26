import type { Shift } from "./db/types";
import { padVolunteers } from "./shift-slots";

export const LEGACY_PLAYWRIGHT_SHIFT_VOL_NAMES = ["Alpha T.", "Beta T.", "Gamma T."] as const;

export type VolunteerIdentity = {
  name: string;
  phone?: string;
  email?: string;
};

export function isE2eVolunteerEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.includes("e2e") && normalized.endsWith("@example.com");
}

export function isE2eVolunteerIdentity(identity: VolunteerIdentity): boolean {
  const name = identity.name.trim();
  const phone = (identity.phone ?? "").trim();
  const email = (identity.email ?? "").trim();
  if (/^e2e\b/i.test(name)) return true;
  if (isE2eVolunteerEmail(email)) return true;
  if (
    !phone &&
    !email &&
    (LEGACY_PLAYWRIGHT_SHIFT_VOL_NAMES as readonly string[]).includes(name)
  ) {
    return true;
  }
  return false;
}

export function sanitizeShiftRow(shift: Shift): Shift {
  return {
    ...shift,
    volunteers: padVolunteers(shift.volunteers).map((volunteer) =>
      isE2eVolunteerIdentity(volunteer)
        ? { ...volunteer, name: "", phone: "", email: "" }
        : volunteer
    ),
  };
}

export function sanitizeShiftRows(shifts: Shift[]): Shift[] {
  return shifts.map(sanitizeShiftRow);
}
