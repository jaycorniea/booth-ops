import { requireWriteAccessApi } from "@/lib/auth";
import { asAuditRecord, recordAudit } from "@/lib/audit-log";
import { assignOnCallToShift, getOnCallById, getShiftById } from "@/lib/db";
import { logPortalEventForRequest } from "@/lib/instrumentation";
import { refreshShiftSlotsKpiSnapshot } from "@/lib/kpi-snapshots";
import { notifyPortalDataChanged } from "@/lib/data-changed";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const denied = await requireWriteAccessApi();
  if (denied) return denied;
  const body = await request.json();
  const shiftId = Number(body.shiftId);
  const onCallId = Number(body.onCallId);
  const slotIndex = Number(body.slotIndex ?? (String(body.slot ?? "").replace(/\D/g, "") || 1));
  const eventDate = body.eventDate ?? null;

  if (!shiftId || !onCallId) {
    return NextResponse.json({ error: "shiftId and onCallId required" }, { status: 400 });
  }

  const beforeShift = await getShiftById(shiftId);
  const onCall = await getOnCallById(onCallId);
  if (!beforeShift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  const result = await assignOnCallToShift(
    shiftId,
    onCallId,
    slotIndex,
    beforeShift.event_date,
    beforeShift.shift_num
  );
  if (!result) {
    return NextResponse.json(
      { error: "On-call volunteer not found or not eligible for assignment" },
      { status: 404 }
    );
  }

  const afterShift = await getShiftById(shiftId);
  await recordAudit({
    entityType: "shift",
    entityId: shiftId,
    operation: "update",
    summary: `Assigned on-call ${onCall?.name ?? onCallId} to shift ${beforeShift?.shift_num ?? shiftId}`,
    before: beforeShift ? asAuditRecord(beforeShift) : null,
    after: afterShift ? asAuditRecord(afterShift) : null,
    eventDate,
  });

  await logPortalEventForRequest(request, {
    eventType: "api",
    action: "on_call.assign",
    eventDate: body.eventDate ?? null,
    detail: { shiftId, onCallId, slotIndex },
  });

  await notifyPortalDataChanged();
  void refreshShiftSlotsKpiSnapshot();

  return NextResponse.json({ ok: true, name: result.name, slotIndex });
}