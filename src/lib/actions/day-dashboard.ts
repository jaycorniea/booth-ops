"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getDayCaptains,
  getChecklist,
  getShiftById,
  setChecklistItem,
  setDayCaptain,
  updateShift,
  type ShiftVolunteer,
} from "../db";
import { requireWriteAccess } from "../auth";
import { asAuditRecord, recordAudit } from "../audit-log";
import { refreshShiftSlotsKpiSnapshot } from "../kpi-snapshots";
import type { CaptainSlot } from "../day-captain-slots";
import { logPortalEvent } from "../instrumentation";
import { notifyPortalDataChanged } from "../data-changed";
import { parseDayCaptainFormData } from "../day-captain-form";
import { formatPhoneDisplay } from "../phone-format";
import { formatVolunteerDisplayName } from "../volunteer-display-name";
import { revalidateDayDashboard } from "./shared";
import { officialSlotIndexes, padVolunteers } from "../shift-slots";

export type DayCaptainRowInput = {
  eventDate: string;
  name: string;
  phone: string;
  email: string;
};

export type ShiftRowInput = {
  eventDate: string;
  volunteers: ShiftVolunteer[];
};

function volunteersFromForm(formData: FormData): ShiftVolunteer[] {
  return officialSlotIndexes().map((slotIndex) => ({
    slot_index: slotIndex,
    name: formatVolunteerDisplayName(String(formData.get(`slot_${slotIndex}_name`) ?? "")),
    phone: formatPhoneDisplay(String(formData.get(`slot_${slotIndex}_phone`) ?? "")),
    email: String(formData.get(`slot_${slotIndex}_email`) ?? ""),
  }));
}

async function persistShiftUpdate(
  id: number,
  eventDate: string,
  patch: {
    volunteers?: ShiftVolunteer[];
    checked_in?: number;
    no_show?: number;
    notes?: string;
  }
) {
  const before = await getShiftById(id);
  if (!before) return;
  await updateShift(id, patch);
  const after = await getShiftById(id);
  await recordAudit({
    entityType: "shift",
    entityId: id,
    operation: "update",
    summary: `Updated shift ${before.shift_num ?? id} on ${eventDate}`,
    before: asAuditRecord(before),
    after: after ? asAuditRecord(after) : null,
    eventDate,
  });
  await logPortalEvent({
    eventType: "mutation",
    action: "shift.update",
    eventDate,
    detail: {
      shiftId: id,
      checkedIn: patch.checked_in === 1,
      noShow: patch.no_show === 1,
    },
  });
  revalidateDayDashboard(eventDate);
  revalidatePath("/schedule");
  revalidatePath("/volunteers");
  await notifyPortalDataChanged();
  void refreshShiftSlotsKpiSnapshot();
}

export async function saveShiftRowAction(
  id: number,
  input: ShiftRowInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireWriteAccess();
    await persistShiftUpdate(id, input.eventDate, {
      volunteers: padVolunteers(input.volunteers),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Save failed" };
  }
}

export async function updateShiftAction(formData: FormData): Promise<void> {
  await requireWriteAccess();
  const id = Number(formData.get("id"));
  const eventDate = String(formData.get("event_date") ?? formData.get("eventDate") ?? "");
  if (!id || !eventDate) return;
  await persistShiftUpdate(id, eventDate, {
    volunteers: volunteersFromForm(formData),
    checked_in: formData.get("checked_in") === "on" ? 1 : 0,
    no_show: formData.get("no_show") === "on" ? 1 : 0,
    notes: String(formData.get("notes") ?? ""),
  });
  redirect(`/day/${eventDate}`);
}

export async function toggleShiftCheckInAction(
  id: number,
  eventDate: string,
  checked: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireWriteAccess();
    await persistShiftUpdate(id, eventDate, { checked_in: checked ? 1 : 0 });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Save failed" };
  }
}

export async function toggleShiftNoShowAction(
  id: number,
  eventDate: string,
  noShow: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireWriteAccess();
    await persistShiftUpdate(id, eventDate, { no_show: noShow ? 1 : 0 });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Save failed" };
  }
}

export async function setDayCaptainAction(formData: FormData): Promise<void> {
  await requireWriteAccess();
  const eventDate = String(formData.get("event_date") ?? formData.get("eventDate") ?? "");
  const captainSlot = (String(formData.get("captain_slot") ?? "full") || "full") as CaptainSlot;
  const parsed = parseDayCaptainFormData(formData);
  if (!eventDate) return;
  await setDayCaptain(eventDate, captainSlot, parsed.name, parsed.phone, parsed.email);
  revalidateDayDashboard(eventDate);
  await notifyPortalDataChanged();
}

export async function saveDayCaptainRowAction(
  captainSlot: CaptainSlot,
  input: DayCaptainRowInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireWriteAccess();
    await setDayCaptain(input.eventDate, captainSlot, input.name, input.phone, input.email);
    revalidateDayDashboard(input.eventDate);
    await notifyPortalDataChanged();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Save failed" };
  }
}

export async function saveDayCaptainFormAction(formData: FormData): Promise<void> {
  await setDayCaptainAction(formData);
}

export async function setChecklistAction(
  eventDateOrForm: string | FormData,
  itemKey?: string,
  checked?: boolean
): Promise<void> {
  await requireWriteAccess();
  let eventDate: string;
  let key: string;
  let isChecked: boolean;
  if (typeof eventDateOrForm === "string") {
    eventDate = eventDateOrForm;
    key = itemKey ?? "";
    isChecked = Boolean(checked);
  } else {
    eventDate = String(eventDateOrForm.get("event_date") ?? eventDateOrForm.get("eventDate") ?? "");
    key = String(eventDateOrForm.get("key") ?? "");
    isChecked =
      eventDateOrForm.get("checked") === "on" || eventDateOrForm.get("checked") === "true";
  }
  if (!eventDate || !key) return;
  await setChecklistItem(eventDate, key, isChecked);
  revalidateDayDashboard(eventDate);
}

void getDayCaptains;
void getChecklist;
