import { PortalChrome } from "@/components/PortalChrome";
import { getAuthRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const role = await getAuthRole();
  if (!role) {
    redirect("/login");
  }
  return <PortalChrome>{children}</PortalChrome>;
}
