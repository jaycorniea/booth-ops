import { clearAuthentication } from "@/lib/auth";
import { logPortalEvent } from "@/lib/instrumentation";
import { redirect } from "next/navigation";

export async function POST() {
  await logPortalEvent({ eventType: "auth", action: "logout" });
  await clearAuthentication();
  redirect("/login");
}