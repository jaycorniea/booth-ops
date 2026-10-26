import { requireWriteAccessApi } from "@/lib/auth";
import { asAuditRecord, recordAudit } from "@/lib/audit-log";
import {
  assignInterestedToShift,
  getInterestedVolunteerById,
  getShiftById,
} from "@/lib/db";
import { logPortalEventForRequest } from "@/lib/instrumentation";
import { refreshShiftSlotsKpiSnapshot } from "@/lib/kpi-snapshots";
import { notifyPortalDataChanged } from "@/lib/data-changed";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const denied = await requireWriteAccessApi();
  if (denied) return denied;
  const body = await request.json();
  const shiftId = Number(body.shiftId);
  const interestedId = Number(body.interestedId);
  const shiftNum = Number(body.shiftNum);
  const eventDate = String(body.eventDate ?? "");
  const slotIndex = Number(body.slotIndex ?? (String(body.slot ?? "").replace(/\D/g, "") || 1));

  if (!shiftId || !interestedId || !eventDate || !shiftNum) {
    return NextResponse.json(
      { error: "shiftId, interestedId, eventDate, and shiftNum required" },
      { status: 400 }
    );
  }

  const beforeShift = await getShiftById(shiftId);
  const volunteer = await getInterestedVolunteerById(interestedId);
  const result = await assignInterestedToShift(shiftId, interestedId, slotIndex, eventDate, shiftNum);
  if (!result) {
    return NextResponse.json({ error: "Interested volunteer not found or already placed" }, { status: 404 });
  }

  const afterShift = await getShiftById(shiftId);
  const afterVolunteer = await getInterestedVolunteerById(interestedId);
  await recordAudit({
    entityType: "shift",
    entityId: shiftId,
    operation: "update",
    summary: `Assigned interested volunteer ${volunteer?.name ?? interestedId} to shift ${shiftNum}`,
    before: beforeShift ? asAuditRecord(beforeShift) : null,
    after: afterShift ? asAuditRecord(afterShift) : null,
    eventDate,
  });
  if (volunteer && afterVolunteer) {
    await recordAudit({
      entityType: "interested_volunteer",
      entityId: interestedId,
      operation: "update",
      summary: `Placed ${volunteer.name} on ${eventDate} shift ${shiftNum}`,
      before: asAuditRecord(volunteer),
      after: asAuditRecord(afterVolunteer),
      eventDate,
    });
  }

  await logPortalEventForRequest(request, {
    eventType: "api",
    action: "interested.assign",
    eventDate,
    detail: { shiftId, interestedId, slotIndex, shiftNum },
  });

  await notifyPortalDataChanged();
  void refreshShiftSlotsKpiSnapshot();

  return NextResponse.json({ ok: true, name: result.name, slotIndex });
}