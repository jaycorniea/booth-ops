import { formatPhoneDisplay } from "./phone-format";
import {
  getSyncMetadata,
  listAllShifts,
  listDayCaptains,
  setDayCaptain,
  setSyncMetadata,
  updateShift,
} from "./db";

export const PHONE_FORMAT_MIGRATION_KEY = "migration_phone_format_v5_4_0";

export type PhoneFormatTableStats = {
  rowsScanned: number;
  fieldsUpdated: number;
};

export type PhoneFormatMigrationResult = {
  dryRun: boolean;
  skipped: boolean;
  reason?: string;
  shifts: PhoneFormatTableStats;
  dayCaptains: PhoneFormatTableStats;
};

function phoneUpdate(raw: string | null | undefined): { next: string; changed: boolean } {
  const original = raw ?? "";
  if (!original.trim()) return { next: original, changed: false };
  const next = formatPhoneDisplay(original);
  return { next, changed: next !== original };
}

export async function formatStoredPhonesInDb(options?: {
  dryRun?: boolean;
  force?: boolean;
}): Promise<PhoneFormatMigrationResult> {
  const dryRun = options?.dryRun ?? false;
  const force = options?.force ?? false;

  const result: PhoneFormatMigrationResult = {
    dryRun,
    skipped: false,
    shifts: { rowsScanned: 0, fieldsUpdated: 0 },
    dayCaptains: { rowsScanned: 0, fieldsUpdated: 0 },
  };

  if (!force && !dryRun) {
    const done = await getSyncMetadata(PHONE_FORMAT_MIGRATION_KEY);
    if (done === "1") {
      result.skipped = true;
      result.reason = "already completed";
      return result;
    }
  }

  const shifts = await listAllShifts();
  for (const shift of shifts) {
    result.shifts.rowsScanned++;
    let changed = false;
    const volunteers = shift.volunteers.map((volunteer) => {
      const phone = phoneUpdate(volunteer.phone);
      if (phone.changed) {
        changed = true;
        result.shifts.fieldsUpdated++;
        return { ...volunteer, phone: phone.next };
      }
      return volunteer;
    });
    if (!changed || dryRun) continue;
    await updateShift(shift.id, { volunteers });
  }

  const captains = await listDayCaptains();
  for (const captain of captains) {
    result.dayCaptains.rowsScanned++;
    const phone = phoneUpdate(captain.phone);
    if (!phone.changed) continue;

    result.dayCaptains.fieldsUpdated++;
    if (dryRun) continue;

    await setDayCaptain(
      captain.event_date,
      captain.captain_slot,
      captain.name,
      phone.next,
      captain.email
    );
  }

  if (!dryRun) {
    await setSyncMetadata(PHONE_FORMAT_MIGRATION_KEY, "1");
  }

  return result;
}
