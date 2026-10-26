import { clearAuthentication } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function POST() {
  await clearAuthentication();
  redirect("/login");
}