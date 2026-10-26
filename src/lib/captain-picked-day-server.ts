import "server-only";

import { CAPTAIN_PICKED_DAY_COOKIE } from "@/lib/captain-picked-day";
import { cookies } from "next/headers";

export async function getCaptainPickedDayKey(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(CAPTAIN_PICKED_DAY_COOKIE)?.value;
}
