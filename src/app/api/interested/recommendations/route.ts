import { listInterestedVolunteers } from "@/lib/db";
import { recommendInterestedVolunteers } from "@/lib/interested-volunteer-matcher";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const eventDate = request.nextUrl.searchParams.get("date");
  const shiftNum = Number(request.nextUrl.searchParams.get("shift"));

  if (!eventDate || !shiftNum) {
    return NextResponse.json({ error: "date and shift required" }, { status: 400 });
  }

  const volunteers = await listInterestedVolunteers("interested");
  const ranked = recommendInterestedVolunteers(volunteers, { eventDate, shiftNum });

  return NextResponse.json({
    recommendations: ranked.map((r) => ({
      id: r.volunteer.id,
      name: r.volunteer.name,
      phone: r.volunteer.phone,
      email: r.volunteer.email,
      bilingual: r.volunteer.bilingual === 1,
      source: r.volunteer.source,
      tier: r.tier,
      reasons: r.reasons,
    })),
  });
}