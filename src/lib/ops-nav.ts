import type { AuthRole } from "@/lib/auth-types";

export type OpsNavLink = {
  href: string;
  label: string;
  home?: boolean;
};

export type OpsNavCaptainMoreMenu = {
  kind: "captain-more-menu";
  label: string;
};

const ADMIN_LINKS: OpsNavLink[] = [
  { href: "/", label: "Home", home: true },
  { href: "/schedule", label: "Schedule" },
  { href: "/volunteers", label: "Profiles" },
  { href: "/kpi", label: "KPIs" },
];

const VOLUNTEER_NAV_LINKS: OpsNavLink[] = [
  { href: "/volunteer", label: "Home", home: true },
  { href: "/schedule", label: "Schedule" },
  { href: "/day-log", label: "Day log" },
];

export function getOpsNavLinks(role: AuthRole): OpsNavLink[] {
  if (role === "viewer" || role === "volunteer") {
    return VOLUNTEER_NAV_LINKS;
  }
  return ADMIN_LINKS;
}
