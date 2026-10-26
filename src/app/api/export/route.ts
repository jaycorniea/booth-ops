import { exportAllData } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const data = await exportAllData();
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="booth-ops-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}