import { BrowserGeoCapture } from "@/components/BrowserGeoCapture";
import { AdminRoleSwitcher } from "@/components/AdminRoleSwitcher";
import { LocalDbDevBanner } from "@/components/LocalDbDevBanner";
import { Nav } from "@/components/Nav";
import { NavTracker } from "@/components/NavTracker";
import { PortalContactFooter } from "@/components/PortalContactFooter";
import { getAuthRole, hasAdminShell, isAdmin } from "@/lib/auth";
import { getCaptainMoreMenuItems, getViewerExtrasMenuItems } from "@/lib/captain-nav";
import { getPortalWindowSim } from "@/lib/portal-window-sim-server";

/** Portal header nav + main content shell (shared by authenticated routes). */
export async function PortalChrome({ children }: { children: React.ReactNode }) {
  const role = await getAuthRole();
  if (!role) return children;

  const admin = await isAdmin();
  const canSwitchRoles = await hasAdminShell();
  const portalWindowSim = await getPortalWindowSim();
  const captainMoreMenuItems =
    role === "captain"
      ? getCaptainMoreMenuItems()
      : role === "viewer"
        ? getViewerExtrasMenuItems()
        : [];

  return (
    <>
      <NavTracker />
      <BrowserGeoCapture />
      <LocalDbDevBanner />
      <Nav
        role={role}
        isAdmin={admin}
        captainMoreMenuItems={captainMoreMenuItems}
        roleSwitcher={canSwitchRoles ? <AdminRoleSwitcher currentRole={role} /> : null}
        portalWindowSim={portalWindowSim}
      />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {children}
        <PortalContactFooter />
      </main>
    </>
  );
}
