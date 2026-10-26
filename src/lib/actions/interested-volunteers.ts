"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addInterestedVolunteer,
  assignInterestedToShift,
  deleteInterestedVolunteer,
  getInterestedVolunteerById,
  getShiftsForDate,
  getShiftById,
  listInterestedVolunteers,
  updateInterestedVolunteer,
} from "../db";
import { requireWriteAccess } from "../auth";
import { asAuditRecord, recordAudit } from "../audit-log";
import { dayDashboardHref } from "../day-routes";
import { getShiftScheduleEntry, isEventDate } from "../event-dates";
import { resolveOpenSlot } from "../interested-open-slots";
import type { VolunteerSlot } from "../shift-slots";
import { logPortalEvent } from "../instrumentation";
import { parseInterestedVolunteerFormData } from "../interested-volunteer-form";
import { refreshShiftSlotsKpiSnapshot } from "../kpi-snapshots";
import { notifyPortalDataChanged } from "../data-changed";

export async function addInterestedVolunteerAction(formData: FormData) {
  await requireWriteAccess();

  const parsed = parseInterestedVolunteerFormData(formData);
  await addInterestedVolunteer({
    ...parsed,
    placed_event_date: "",
    placed_shift_num: null,
  });
  const created = (await listInterestedVolunteers()).find(
    (row) => row.name === parsed.name && row.email === parsed.email
  );
  await recordAudit({
    entityType: "interested_volunteer",
    entityId: created?.id ?? parsed.name,
    operation: "create",
    summary: `Added interested volunteer ${parsed.name}`,
    after: created ? asAuditRecord(created) : asAuditRecord(parsed),
  });
  await logPortalEvent({ eventType: "mutation", action: "interested.add" });
  revalidatePath("/interested");
  await notifyPortalDataChanged();
}

export async function updateInterestedVolunteerAction(id: number, formData: FormData) {
  await requireWriteAccess();

  const before = await getInterestedVolunteerById(id);
  const parsed = parseInterestedVolunteerFormData(formData);
  await updateInterestedVolunteer(id, parsed);
  const after = await getInterestedVolunteerById(id);
  await recordAudit({
    entityType: "interested_volunteer",
    entityId: id,
    operation: "update",
    summary: `Updated interested volunteer ${before?.name ?? id}`,
    before: before ? asAuditRecord(before) : null,
    after: after ? asAuditRecord(after) : null,
  });
  await logPortalEvent({
    eventType: "mutation",
    action: "interested.update",
    detail: { interestedId: id },
  });
  revalidatePath("/interested");
  await notifyPortalDataChanged();
}

export async function deleteInterestedVolunteerAction(id: number) {
  await requireWriteAccess();

  const before = await getInterestedVolunteerById(id);
  await deleteInterestedVolunteer(id);
  await recordAudit({
    entityType: "interested_volunteer",
    entityId: id,
    operation: "delete",
    summary: `Deleted interested volunteer ${before?.name ?? id}`,
    before: before ? asAuditRecord(before) : null,
  });
  await logPortalEvent({
    eventType: "mutation",
    action: "interested.delete",
    detail: { interestedId: id },
  });
  revalidatePath("/interested");
  await notifyPortalDataChanged();
}

export async function assignInterestedVolunteerToShiftAction(id: number, formData: FormData) {
  await requireWriteAccess();

  const eventDate = String(formData.get("event_date") ?? "").trim();
  const shiftNum = Number(formData.get("shift_num"));
  const slotRaw = String(formData.get("slot") ?? "auto");
  const parsedSlot = Number(slotRaw.replace(/\D/g, ""));
  const requestedSlot: "auto" | VolunteerSlot = parsedSlot >= 1 ? parsedSlot : "auto";

  const fail = (code: string) => {
    redirect(`/interested/${id}/assign?error=${code}`);
  };

  if (!isEventDate(eventDate) || !getShiftScheduleEntry(shiftNum)) {
    fail("assign_shift");
  }

  const shifts = await getShiftsForDate(eventDate);
  const shift = shifts.find((row) => row.shift_num === shiftNum);
  if (!shift?.id) {
    fail("assign_shift");
  }

  const slot = resolveOpenSlot(shift!, requestedSlot);
  if (!slot) {
    fail("assign_full");
  }

  const beforeShift = await getShiftById(shift!.id);
  const volunteer = await getInterestedVolunteerById(id);
  const result = await assignInterestedToShift(shift!.id, id, slot!, eventDate, shiftNum);
  if (!result) {
    fail("assign_placed");
  }

  const afterShift = await getShiftById(shift!.id);
  const afterVolunteer = await getInterestedVolunteerById(id);
  await recordAudit({
    entityType: "shift",
    entityId: shift!.id,
    operation: "update",
    summary: `Assigned interested volunteer ${volunteer?.name ?? id} to shift ${shiftNum}`,
    before: beforeShift ? asAuditRecord(beforeShift) : null,
    after: afterShift ? asAuditRecord(afterShift) : null,
    eventDate,
  });
  if (volunteer && afterVolunteer) {
    await recordAudit({
      entityType: "interested_volunteer",
      entityId: id,
      operation: "update",
      summary: `Placed ${volunteer.name} on ${eventDate} shift ${shiftNum}`,
      before: asAuditRecord(volunteer),
      after: asAuditRecord(afterVolunteer),
      eventDate,
    });
  }

  await logPortalEvent({
    eventType: "mutation",
    action: "interested.assign",
    eventDate,
    detail: { shiftId: shift!.id, interestedId: id, slot, shiftNum },
  });
  await notifyPortalDataChanged();
  void refreshShiftSlotsKpiSnapshot();
  revalidatePath("/interested");
  revalidatePath(`/interested/${id}/assign`);
  revalidatePath(dayDashboardHref(eventDate));
  redirect("/interested?assigned=1");
}