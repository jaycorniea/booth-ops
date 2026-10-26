"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../auth";
import { logPortalEvent } from "../instrumentation";

export async function saveCaptainIpMappingAction(formData: FormData) {
  await requireAdmin();
  const clientIp = String(formData.get("client_ip") ?? "").trim();
  const dayCaptainKey = String(formData.get("day_captain") ?? "").trim();
  const guestName = String(formData.get("guest_name") ?? "").trim();
  const visitedEventDate = String(formData.get("visited_event_date") ?? "").trim();
  const firstVisitDay = String(formData.get("first_visit_day") ?? "").trim();
  const scope = String(formData.get("scope") ?? "").trim();

  const {
    applyCaptainMappingToIp,
    listDayCaptainOptions,
    resolveCaptainIpMappingSelection,
    upsertCaptainIpMappingAdmin,
  } = await import("../captain-ip-mappings");
  const options = await listDayCaptainOptions();
  const resolved = resolveCaptainIpMappingSelection({
    dayCaptainKey,
    visitedEventDate: visitedEventDate || firstVisitDay || undefined,
    firstVisitDay: firstVisitDay || undefined,
    guestName,
    options,
  });

  if (!clientIp || !resolved) {
    redirect("/captain-ips?error=missing");
  }

  const { eventDate, captainSlot, notes } = resolved;

  try {
    if (scope === "ip") {
      await applyCaptainMappingToIp(clientIp, { eventDate, captainSlot, notes });
    } else {
      await upsertCaptainIpMappingAdmin({ clientIp, eventDate, captainSlot, notes });
    }
  } catch {
    redirect("/captain-ips?error=invalid");
  }

  await logPortalEvent({
    eventType: "mutation",
    action: "captain_ip.save",
    eventDate,
    detail: { clientIp, captainSlot, scope: scope || "visit" },
  });
  revalidatePath("/captain-ips");
  redirect("/captain-ips?saved=1");
}

export async function rerunCaptainIpInferenceAction() {
  await requireAdmin();
  const { rerunCaptainIpInference } = await import("../captain-ip-mappings");
  const result = await rerunCaptainIpInference();
  await logPortalEvent({
    eventType: "mutation",
    action: "captain_ip.rerun",
    detail: { ...result },
  });
  revalidatePath("/captain-ips");
  const params = new URLSearchParams({
    rerun: "1",
    processed: String(result.processed),
    admin: String(result.adminTagged),
    captain: String(result.captainInferred),
    preserved: String(result.manualPreserved),
    locked: String(result.lockedApplied),
    guest: String(result.guestApplied),
    removed: String(result.staleRemoved),
  });
  redirect(`/captain-ips?${params.toString()}`);
}

export async function deleteCaptainIpMappingAction(formData: FormData) {
  await requireAdmin();
  const clientIp = String(formData.get("client_ip") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "").trim();
  const scope = String(formData.get("scope") ?? "").trim();
  if (!clientIp) redirect("/captain-ips");

  const { deleteAllCaptainIpMappings, deleteCaptainIpMapping } = await import(
    "../captain-ip-mappings"
  );

  if (scope === "ip") {
    await deleteAllCaptainIpMappings(clientIp);
  } else {
    if (!eventDate) redirect("/captain-ips");
    await deleteCaptainIpMapping(clientIp, eventDate);
  }

  await logPortalEvent({
    eventType: "mutation",
    action: "captain_ip.delete",
    eventDate: eventDate || null,
    detail: { clientIp, scope: scope || "visit" },
  });
  revalidatePath("/captain-ips");
  redirect("/captain-ips?deleted=1");
}
