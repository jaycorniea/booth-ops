import { requireAdminApi } from "@/lib/auth";
import {
  buildSessionActivitySummary,
  getPortalSessionTimeline,
  parsePortalActivityQuery,
  type PortalActivitySummaryStop,
  type PortalTimelineEntry,
} from "@/lib/portal-activity";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const sessionId = params.session?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "session is required" }, { status: 400 });
  }

  const query = parsePortalActivityQuery(params);
  const timeline: PortalTimelineEntry[] = await getPortalSessionTimeline(sessionId, query);
  const summary_stops: PortalActivitySummaryStop[] =
    buildSessionActivitySummary(timeline).stops;
  return NextResponse.json({ timeline, summary_stops });
}
