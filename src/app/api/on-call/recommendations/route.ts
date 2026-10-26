import { listActiveOnCall } from "@/lib/db";
import { recommendOnCallVolunteers } from "@/lib/on-call-matcher";
import { getShiftSchedule } from "@/lib/event-dates";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const eventDate = searchParams.get("date");
  const shiftNum = Number(searchParams.get("shift"));

  if (!eventDate || !getShiftSchedule().some((s) => s.num === shiftNum)) {
    return NextResponse.json({ error: "date and shift (1–6) required" }, { status: 400 });
  }

  const volunteers = await listActiveOnCall();
  const recommendations = recommendOnCallVolunteers(volunteers, { eventDate, shiftNum });

  return NextResponse.json({
    eventDate,
    shiftNum,
    poolSize: volunteers.length,
    matchCount: recommendations.length,
    recommendations: recommendations.map((r) => ({
      id: r.volunteer.id,
      name: r.volunteer.name,
      phone: r.volunteer.phone,
      email: r.volunteer.email,
      notice_minutes: r.volunteer.notice_minutes,
      bilingual: r.volunteer.bilingual === 1,
      tier: r.tier,
      score: r.score,
      reasons: r.reasons,
      last_contacted: r.volunteer.last_contacted,
    })),
  });
}