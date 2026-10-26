"use server";

import { redirect } from "next/navigation";
import { addInterestedVolunteer, listInterestedVolunteers } from "../db";
import {
  hasShiftSignupAccess,
  hasVolunteerSignupAccess,
  setVolunteerSignupAccess,
  verifyVolunteerSignupOrPortalPassword,
} from "../auth";
import { asAuditRecord, recordAudit } from "../audit-log";
import { isEventDate } from "../event-dates";
import { logPortalEvent } from "../instrumentation";
import { notifyPortalDataChanged } from "../data-changed";
import { parseInterestedVolunteerFormData } from "../interested-volunteer-form";


export async function unlockDayShiftSignupAction(eventDate: string, formData: FormData) {
  if (!isEventDate(eventDate)) redirect("/volunteer");

  const password = String(formData.get("signup_password") ?? "");
  if (!verifyVolunteerSignupOrPortalPassword(password)) {
    await logPortalEvent({ eventType: "auth", action: "volunteer_signup_gate_failed", eventDate });
    redirect(`/join-shift/${eventDate}?error=password`);
  }
  await setVolunteerSignupAccess();
  redirect(`/join-shift/${eventDate}`);
}

export async function submitDayShiftSignupAction(eventDate: string, formData: FormData) {
  if (!isEventDate(eventDate)) redirect("/volunteer");

  if (!(await hasVolunteerSignupAccess())) {
    await logPortalEvent({ eventType: "auth", action: "volunteer_signup_failed", eventDate });
    redirect(`/join-shift/${eventDate}?error=password`);
  }

  const parsed = parseInterestedVolunteerFormData(formData);
  if (!parsed.name.trim()) {
    redirect(`/join-shift/${eventDate}?error=name`);
  }

  const { listOpenShiftNumsForEventDate, restrictShiftPreferenceToOpen } = await import(
    "../day-shift-signup"
  );
  const openShiftNums = await listOpenShiftNumsForEventDate(eventDate);
  const available_shifts = restrictShiftPreferenceToOpen(parsed.available_shifts, openShiftNums);
  if (!available_shifts) {
    redirect(`/join-shift/${eventDate}?error=${openShiftNums.length === 0 ? "no_shifts" : "shifts"}`);
  }

  await addInterestedVolunteer({
    ...parsed,
    available_dates: eventDate,
    available_shifts,
    status: "interested",
    placed_event_date: "",
    placed_shift_num: null,
    source: `day-signup-${eventDate}`,
  });
  const created = (await listInterestedVolunteers()).find(
    (row) => row.name === parsed.name && row.phone === parsed.phone
  );
  await recordAudit({
    entityType: "interested_volunteer",
    entityId: created?.id ?? parsed.name,
    operation: "create",
    summary: `Volunteer applied for shift on ${eventDate}: ${parsed.name}`,
    eventDate,
    after: created ? asAuditRecord(created) : asAuditRecord({ ...parsed, status: "interested" }),
  });
  await logPortalEvent({
    eventType: "mutation",
    action: "interested.day_signup",
    eventDate,
    detail: { interestedId: created?.id ?? null },
  });
  await notifyPortalDataChanged();
  redirect(`/join-shift/${eventDate}?saved=1`);
}

export async function unlockShiftSignupAction(formData: FormData) {
  const password = String(formData.get("signup_password") ?? "");
  if (!verifyVolunteerSignupOrPortalPassword(password)) {
    await logPortalEvent({ eventType: "auth", action: "shift_signup_gate_failed" });
    redirect("/join-shift?error=password");
  }
  await setVolunteerSignupAccess();
  redirect("/join-shift");
}

export async function submitShiftSignupAction(formData: FormData) {
  if (!(await hasShiftSignupAccess())) {
    await logPortalEvent({ eventType: "auth", action: "shift_signup_failed" });
    redirect("/join-shift?error=password");
  }

  const parsed = parseInterestedVolunteerFormData(formData);
  if (!parsed.name.trim()) {
    redirect("/join-shift?error=name");
  }

  await addInterestedVolunteer({
    ...parsed,
    status: "interested",
    placed_event_date: "",
    placed_shift_num: null,
    source: parsed.source || "portal-signup",
  });
  const created = (await listInterestedVolunteers()).find(
    (row) => row.name === parsed.name && row.phone === parsed.phone
  );
  await recordAudit({
    entityType: "interested_volunteer",
    entityId: created?.id ?? parsed.name,
    operation: "create",
    summary: `Volunteer applied for shift: ${parsed.name}`,
    after: created ? asAuditRecord(created) : asAuditRecord({ ...parsed, status: "interested" }),
  });
  await logPortalEvent({
    eventType: "mutation",
    action: "interested.signup",
    detail: { interestedId: created?.id ?? null },
  });
  await notifyPortalDataChanged();
  redirect("/join-shift?saved=1");
}
