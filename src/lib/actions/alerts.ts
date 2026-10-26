"use server";

import { clearPortalAlerts } from "../portal-alerts-store";
import { requireAdmin } from "../auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function clearPortalAlertsAction() {
  await requireAdmin();
  await clearPortalAlerts();
  revalidatePath("/alerts");
  redirect("/alerts?cleared=1");
}