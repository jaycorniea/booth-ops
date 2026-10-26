"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../auth";
import { saveEventSettings } from "../db";
import { parseEventSettingsInput } from "../event-settings";

export async function saveEventSettingsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = parseEventSettingsInput({
    year: String(formData.get("year") ?? ""),
    openDate: String(formData.get("openDate") ?? ""),
    closeDate: String(formData.get("closeDate") ?? ""),
    setupStartDate: String(formData.get("setupStartDate") ?? ""),
    setupEndDate: String(formData.get("setupEndDate") ?? ""),
    captainToolsOpenDate: String(formData.get("captainToolsOpenDate") ?? ""),
    splitCaptainDate: String(formData.get("splitCaptainDate") ?? ""),
    boothName: String(formData.get("boothName") ?? ""),
    boothLocation: String(formData.get("boothLocation") ?? ""),
    boothHours: String(formData.get("boothHours") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    contactPhone: String(formData.get("contactPhone") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
  });

  if (!parsed.ok) {
    redirect("/event-settings?error=invalid");
  }

  await saveEventSettings(parsed.settings);
  revalidatePath("/", "layout");
  revalidatePath("/event-settings");
  revalidatePath("/schedule");
  redirect("/event-settings?saved=1");
}
