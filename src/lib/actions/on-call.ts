"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addOnCall,
  deleteOnCall,
  getInterestedVolunteerById,
  getOnCallById,
  listOnCall,
  clearPendingOnCallShiftRequests,
  updateOnCall,
} from "../db";
import {
  hasOnCallSignupAccess,
  isAdmin,
  requireAdmin,
  requireWriteAccess,
  setOnCallSignupAccess,
  verifyOnCallSignupOrPortalPassword,
} from "../auth";
import { asAuditRecord, recordAudit } from "../audit-log";
import { logPortalEvent } from "../instrumentation";
import { parseOnCallFormData } from "../on-call-form";
import { isOnCallVolunteerStatus } from "../on-call-status";
import { notifyPortalDataChanged } from "../data-changed";
import { formatVolunteerDisplayName } from "../volunteer-display-name";

export async function unlockOnCallSignupAction(formData: FormData) {
  const password = String(formData.get("signup_password") ?? "");
  if (!verifyOnCallSignupOrPortalPassword(password)) {
    await logPortalEvent({ eventType: "auth", action: "on_call_signup_gate_failed" });
    redirect("/join-on-call?error=password");
  }
  await setOnCallSignupAccess();
  redirect("/join-on-call");
}

export async function submitOnCallSignupAction(formData: FormData) {
  if (!(await hasOnCallSignupAccess())) {
    await logPortalEvent({ eventType: "auth", action: "on_call_signup_failed" });
    redirect("/join-on-call?error=password");
  }

  const parsed = parseOnCallFormData(formData);
  if (!parsed.name.trim()) {
    redirect("/join-on-call?error=name");
  }

  await addOnCall({ ...parsed, status: "new" });
  const created = (await listOnCall("new")).find(
    (row) => row.name === parsed.name && row.phone === parsed.phone
  );
  await recordAudit({
    entityType: "on_call",
    entityId: created?.id ?? parsed.name,
    operation: "create",
    summary: `Volunteer applied for on-call list: ${parsed.name}`,
    after: created ? asAuditRecord(created) : asAuditRecord({ ...parsed, status: "new" }),
  });
  await logPortalEvent({
    eventType: "mutation",
    action: "on_call.signup",
    detail: { onCallId: created?.id ?? null },
  });
  await notifyPortalDataChanged();
  redirect("/join-on-call?saved=1");
}

export async function addVolunteerProfileToOnCallAction(formData: FormData) {
  await requireWriteAccess();

  const name = formatVolunteerDisplayName(String(formData.get("name") ?? ""));
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const interestedId = Number(formData.get("interested_id") ?? 0);

  if (!name.trim()) {
    redirect("/volunteers?error=on_call_name");
  }

  const { volunteerContactKey } = await import("../volunteer-profiles");
  const contactKey = volunteerContactKey(name, phone, email);
  const duplicate = (await listOnCall()).find(
    (row) => volunteerContactKey(row.name, row.phone, row.email) === contactKey
  );
  if (duplicate) {
    redirect("/volunteers?on_call_exists=1");
  }

  let available_dates = "any";
  let available_shifts = "any";
  let availability = "";
  let bilingual = 0;
  if (interestedId > 0) {
    const interested = await getInterestedVolunteerById(interestedId);
    if (interested) {
      available_dates = interested.available_dates;
      available_shifts = interested.available_shifts;
      availability = interested.notes;
      bilingual = interested.bilingual;
    }
  }

  await addOnCall({
    name,
    phone,
    email,
    availability,
    notice_minutes: 45,
    available_dates,
    available_shifts,
    bilingual,
    status: "approved",
  });
  const created = (await listOnCall()).find(
    (row) => volunteerContactKey(row.name, row.phone, row.email) === contactKey
  );
  await recordAudit({
    entityType: "on_call",
    entityId: created?.id ?? name,
    operation: "create",
    summary: `Added ${name} to on-call pool from volunteer profile`,
    after: created ? asAuditRecord(created) : asAuditRecord({ name, phone, email, status: "approved" }),
  });
  await logPortalEvent({
    eventType: "mutation",
    action: "on_call.add_from_profile",
    detail: { onCallId: created?.id ?? null, interestedId: interestedId || null },
  });
  revalidatePath("/volunteers");
  revalidatePath("/on-call");
  await notifyPortalDataChanged();
  redirect("/volunteers?on_call_added=1");
}

export async function addOnCallAction(formData: FormData) {
  await requireWriteAccess();

  const parsed = parseOnCallFormData(formData);
  await addOnCall({ ...parsed, status: "approved" });
  const created = (await listOnCall()).find(
    (row) => row.name === parsed.name && row.phone === parsed.phone
  );
  await recordAudit({
    entityType: "on_call",
    entityId: created?.id ?? parsed.name,
    operation: "create",
    summary: `Added on-call volunteer ${parsed.name}`,
    after: created ? asAuditRecord(created) : asAuditRecord(parsed),
  });
  await logPortalEvent({ eventType: "mutation", action: "on_call.add" });
  revalidatePath("/on-call");
  await notifyPortalDataChanged();
}

export async function approveOnCallAction(id: number) {
  await requireAdmin();

  const before = await getOnCallById(id);
  if (!before || before.status !== "new") {
    redirect("/on-call?error=approve");
  }
  await updateOnCall(id, { status: "approved" });
  const after = await getOnCallById(id);
  await recordAudit({
    entityType: "on_call",
    entityId: id,
    operation: "update",
    summary: `Approved on-call volunteer ${before.name}`,
    before: asAuditRecord(before),
    after: after ? asAuditRecord(after) : null,
    fields: ["status"],
  });
  await logPortalEvent({
    eventType: "mutation",
    action: "on_call.approve",
    detail: { onCallId: id },
  });
  revalidatePath("/on-call");
  await notifyPortalDataChanged();
}

export async function rejectOnCallAction(id: number) {
  await requireAdmin();

  const before = await getOnCallById(id);
  if (!before || before.status !== "new") {
    redirect("/on-call?error=reject");
  }
  await updateOnCall(id, { status: "withdrawn" });
  const after = await getOnCallById(id);
  await recordAudit({
    entityType: "on_call",
    entityId: id,
    operation: "update",
    summary: `Rejected on-call application ${before.name}`,
    before: asAuditRecord(before),
    after: after ? asAuditRecord(after) : null,
    fields: ["status"],
  });
  await logPortalEvent({
    eventType: "mutation",
    action: "on_call.reject",
    detail: { onCallId: id },
  });
  revalidatePath("/on-call");
  await notifyPortalDataChanged();
}

export async function updateOnCallAction(id: number, formData: FormData) {
  await requireWriteAccess();

  const before = await getOnCallById(id);
  const parsed = parseOnCallFormData(formData);
  const admin = await isAdmin();
  const requestedStatus = String(formData.get("status") ?? before?.status ?? "approved");
  const patch: Parameters<typeof updateOnCall>[1] = { ...parsed };

  if (admin && isOnCallVolunteerStatus(requestedStatus) && requestedStatus !== before?.status) {
    patch.status = requestedStatus;
    if (requestedStatus === "approved" && before?.status === "shift_requested") {
      patch.last_contacted = "";
      patch.contacted_event_date = "";
      patch.contacted_shift_num = null;
      await clearPendingOnCallShiftRequests(id);
    }
  }

  await updateOnCall(id, patch);
  const after = await getOnCallById(id);
  await recordAudit({
    entityType: "on_call",
    entityId: id,
    operation: "update",
    summary: `Updated on-call volunteer ${before?.name ?? id}`,
    before: before ? asAuditRecord(before) : null,
    after: after ? asAuditRecord(after) : null,
  });
  await logPortalEvent({
    eventType: "mutation",
    action: "on_call.update",
    detail: { onCallId: id },
  });
  revalidatePath("/on-call");
  await notifyPortalDataChanged();
}

export async function deleteOnCallAction(id: number) {
  await requireWriteAccess();

  const before = await getOnCallById(id);
  await deleteOnCall(id);
  await recordAudit({
    entityType: "on_call",
    entityId: id,
    operation: "delete",
    summary: `Deleted on-call volunteer ${before?.name ?? id}`,
    before: before ? asAuditRecord(before) : null,
  });
  await logPortalEvent({
    eventType: "mutation",
    action: "on_call.delete",
    detail: { onCallId: id },
  });
  revalidatePath("/on-call");
  await notifyPortalDataChanged();
}
