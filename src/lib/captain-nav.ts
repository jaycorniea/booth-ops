import type { OpsNavCaptainMoreMenu, OpsNavLink } from "@/lib/ops-nav";

export const CAPTAIN_MORE_NAV_LABEL = "More";

export type CaptainNavMenuItem = {
  href: string;
  label: string;
};

export type CaptainNavEntry = OpsNavLink | OpsNavCaptainMoreMenu;

export function getCaptainMoreMenuItems(): CaptainNavMenuItem[] {
  return [
    { href: "/day-log", label: "Day log" },
    { href: "/more/add-volunteer", label: "Add a volunteer" },
    { href: "/kpi", label: "KPIs" },
  ];
}

export function getCaptainNavLinks(): CaptainNavEntry[] {
  return [
    { href: "/", label: "Home", home: true },
    { href: "/schedule", label: "Schedule" },
    { href: "/volunteers", label: "Profiles" },
    { kind: "captain-more-menu", label: CAPTAIN_MORE_NAV_LABEL },
  ];
}
