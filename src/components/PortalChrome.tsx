import { BrowserGeoCapture } from "@/components/BrowserGeoCapture";
import { AdminRoleSwitcher } from "@/components/AdminRoleSwitcher";
import { LocalDbDevBanner } from "@/components/LocalDbDevBanner";
import { Nav } from "@/components/Nav";
import { NavTracker } from "@/components/NavTracker";
import { PortalContactFooter } from "@/components/PortalContactFooter";
import { getAuthRole, hasAdminShell, isAdmin } from "@/lib/auth";
import { getCaptainMoreMenuItems, getViewerExtrasMenuItems } from "@/lib/captain-nav";
import { getPortalAsOf, getPortalWindowSim } from "@/lib/portal-window-sim-server";
import { isCaptainFeedbackOpen, isIssueLogOpen } from "@/lib/event-dates";

/** Portal header nav + main content shell (shared by authenticated routes). */
export async function PortalChrome({ children }: { children: React.ReactNode }) {
  const role = await getAuthRole();
  if (!role) return children;

  const admin = await isAdmin();
  const canSwitchRoles = await hasAdminShell();
  const [portalWindowSim, portalAsOf] = await Promise.all([getPortalWindowSim(), getPortalAsOf()]);
  const showIssues = isIssueLogOpen(portalAsOf);
  const feedbackOpen = isCaptainFeedbackOpen(portalAsOf);
  const captainMoreMenuItems =
    role === "captain"
      ? getCaptainMoreMenuItems({
          showFeedback: feedbackOpen,
          showIssues,
        })
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
        showIssues={showIssues}
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
