"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addIssue, getIssueById, resolveIssue, setIssueResponse } from "../db";
import { requireAdmin, requireWriteAccess } from "../auth";
import { asAuditRecord, recordAudit } from "../audit-log";
import { isIssueLogOpenForPortal } from "../portal-window-sim-server";
import { logPortalEvent } from "../instrumentation";
import { notifyPortalDataChanged } from "../data-changed";

export async function addIssueAction(formData: FormData) {
  await requireWriteAccess();

  if (!(await isIssueLogOpenForPortal())) {
    redirect("/issues?error=closed");
  }

  const eventDate = String(formData.get("event_date"));
  const issue = {
    event_date: eventDate,
    shift: String(formData.get("shift") ?? ""),
    category: String(formData.get("category") ?? "visitor"),
    description: String(formData.get("description")),
  };
  await addIssue(issue);
  await recordAudit({
    entityType: "issue",
    entityId: `${eventDate}:${issue.category}`,
    operation: "create",
    summary: `Added issue on ${eventDate}`,
    after: asAuditRecord(issue),
    eventDate,
  });
  await logPortalEvent({
    eventType: "mutation",
    action: "issue.add",
    eventDate,
    detail: { category: issue.category },
  });
  revalidatePath("/issues");
  await notifyPortalDataChanged();
}

export async function resolveIssueAction(id: number) {
  await requireWriteAccess();

  if (!(await isIssueLogOpenForPortal())) {
    redirect("/issues?error=closed");
  }

  const before = await getIssueById(id);
  await resolveIssue(id);
  const after = await getIssueById(id);
  await recordAudit({
    entityType: "issue",
    entityId: id,
    operation: "update",
    summary: `Resolved issue ${id}`,
    before: before ? asAuditRecord(before) : null,
    after: after ? asAuditRecord(after) : null,
    fields: ["resolved"],
    eventDate: before?.event_date ?? null,
  });
  await logPortalEvent({
    eventType: "mutation",
    action: "issue.resolve",
    detail: { issueId: id },
  });
  revalidatePath("/issues");
  await notifyPortalDataChanged();
}

export async function respondIssueAction(id: number, formData: FormData) {
  await requireAdmin();

  if (!(await isIssueLogOpenForPortal())) {
    redirect("/issues?error=closed");
  }

  const before = await getIssueById(id);
  if (!before) {
    redirect("/issues?error=notfound");
  }

  const adminResponse = String(formData.get("admin_response") ?? "").trim();
  await setIssueResponse(id, adminResponse);
  const after = await getIssueById(id);

  await recordAudit({
    entityType: "issue",
    entityId: id,
    operation: "update",
    summary: adminResponse
      ? `PI response on issue #${id} (${before.category})`
      : `Cleared PI response on issue #${id}`,
    before: before ? asAuditRecord(before) : null,
    after: after ? asAuditRecord(after) : null,
    fields: ["admin_response", "admin_response_at"],
    eventDate: before.event_date || null,
  });
  await logPortalEvent({
    eventType: "mutation",
    action: "issue.respond",
    eventDate: before.event_date || null,
    detail: { issueId: id, hasResponse: Boolean(adminResponse) },
  });

  revalidatePath("/issues");
  redirect("/issues?response_saved=1");
}
