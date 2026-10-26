"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addCaptainFeedback,
  getCaptainFeedbackById,
  setCaptainFeedbackResponse,
} from "../db";
import { requireAdmin, requireWriteAccess } from "../auth";
import { asAuditRecord, recordAudit } from "../audit-log";
import { isCaptainFeedbackOpenForPortal } from "@/lib/portal-window-sim-server";
import { logPortalEvent } from "../instrumentation";
import { notifyPortalDataChanged } from "../data-changed";

export async function submitCaptainFeedbackAction(formData: FormData) {
  await requireWriteAccess();

  if (!(await isCaptainFeedbackOpenForPortal())) {
    redirect("/feedback?error=closed");
  }
  const comments = String(formData.get("comments") ?? "").trim();
  if (!comments) {
    redirect("/feedback?error=comments");
  }
  const ratingRaw = String(formData.get("portal_rating") ?? "");
  const portalRating = ratingRaw ? Number(ratingRaw) : null;
  const entry = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    event_date: String(formData.get("event_date") ?? "").trim(),
    category: String(formData.get("category") ?? "general"),
    portal_rating:
      portalRating != null && portalRating >= 1 && portalRating <= 5 ? portalRating : null,
    comments,
  };
  try {
    await addCaptainFeedback(entry);
    await recordAudit({
      entityType: "captain_feedback",
      entityId: entry.name || "anonymous",
      operation: "create",
      summary: `Day Captain feedback from ${entry.name || "anonymous"}`,
      after: asAuditRecord(entry),
      eventDate: entry.event_date || null,
    });
    await logPortalEvent({
      eventType: "mutation",
      action: "feedback.submit",
      eventDate: entry.event_date || null,
      detail: { category: entry.category },
    });
  } catch {
    redirect("/feedback?error=save");
  }
  revalidatePath("/feedback");
  revalidatePath("/reports");
  await notifyPortalDataChanged();
  redirect("/feedback?saved=1");
}

export async function respondCaptainFeedbackAction(id: number, formData: FormData) {
  await requireAdmin();

  const before = await getCaptainFeedbackById(id);
  if (!before) {
    redirect("/feedback?error=notfound");
  }

  const adminResponse = String(formData.get("admin_response") ?? "").trim();
  await setCaptainFeedbackResponse(id, adminResponse);
  const after = await getCaptainFeedbackById(id);

  await recordAudit({
    entityType: "captain_feedback",
    entityId: id,
    operation: "update",
    summary: adminResponse
      ? `PI response on feedback #${id} from ${before.name || "anonymous"}`
      : `Cleared PI response on feedback #${id}`,
    before: before ? asAuditRecord(before) : null,
    after: after ? asAuditRecord(after) : null,
    fields: ["admin_response", "admin_response_at"],
    eventDate: before.event_date || null,
  });
  await logPortalEvent({
    eventType: "mutation",
    action: "feedback.respond",
    eventDate: before.event_date || null,
    detail: { feedbackId: id, hasResponse: Boolean(adminResponse) },
  });

  revalidatePath("/feedback");
  redirect("/feedback?response_saved=1");
}
