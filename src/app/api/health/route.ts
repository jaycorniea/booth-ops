import { getStorageMode, pingDatabase } from "@/lib/db-client";
import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";

export async function GET() {
  const database = await pingDatabase();

  const ok = database;

  return NextResponse.json(
    {
      ok,
      version: packageJson.version,
      storage: getStorageMode(),
      database,
    },
    { status: ok ? 200 : 503 }
  );
}