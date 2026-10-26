import { parseAuditChanges, type AuditLogEntry } from "./audit-log";
import { sqlAll, sqlRun } from "./db-client";
import type { Shift } from "./db/types";
import { padVolunteers } from "./shift-slots";

export const E2E_VOLUNTEER_NAME_PREFIX = "E2E ";
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

export function isE2eVolunteerName(name: string): boolean {
  return isE2eVolunteerIdentity({ name });
}

export function isE2eAuditEntry(entry: AuditLogEntry): boolean {
  if (/\bE2E\b/i.test(entry.summary)) return true;
  if (/e2e[^@\s]*@example\.com/i.test(entry.summary)) return true;
  const changes = parseAuditChanges(entry.changes);
  for (const [key, change] of Object.entries(changes)) {
    if (key === "name" || key.endsWith("_name")) {
      if (isE2eVolunteerIdentity({ name: String(change.from ?? "") })) return true;
      if (isE2eVolunteerIdentity({ name: String(change.to ?? "") })) return true;
    }
    if (key === "email" || key.endsWith("_email")) {
      const from = String(change.from ?? "");
      const to = String(change.to ?? "");
      if (isE2eVolunteerEmail(from) || isE2eVolunteerEmail(to)) return true;
    }
  }
  return false;
}

export function isE2ePortalAlert(alert: { title: string; detail: string }): boolean {
  if (/\bE2E\b/i.test(alert.title)) return true;
  if (/e2e[^@\s]*@example\.com/i.test(alert.title)) return true;
  if (/e2e note/i.test(alert.detail)) return true;
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

export async function purgeE2eArtifacts(): Promise<void> {
  try {
    await sqlRun(
      `UPDATE shift_assignments SET name = '', phone = '', email = ''
       WHERE name GLOB 'E2E *' OR LOWER(email) GLOB '*e2e*@example.com'`
    );
    await sqlRun(
      `DELETE FROM interested_volunteers
       WHERE name GLOB 'E2E *' OR LOWER(email) GLOB '*e2e*@example.com'`
    );
    await sqlRun(
      `DELETE FROM on_call
       WHERE name GLOB 'E2E *' OR LOWER(email) GLOB '*e2e*@example.com'`
    );
  } catch {
    /* tables may not exist yet */
  }
  void sqlAll;
}
