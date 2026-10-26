import { exportAllData } from "@/lib/db";
import { logPortalEventForRequest } from "@/lib/instrumentation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  await logPortalEventForRequest(request, {
    eventType: "api",
    action: "export.json",
    path: "/api/export",
  });
  const data = await exportAllData();
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="booth-ops-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}