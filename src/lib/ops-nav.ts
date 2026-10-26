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

export type OpsNavUnusedMenu = {
  kind: "unused-menu";
  label: string;
};

export type OpsNavOrientationMenu = {
  kind: "orientation-menu";
  label: string;
};

export type OpsNavEntry =
  | OpsNavLink
  | OpsNavCaptainMoreMenu
  | OpsNavUnusedMenu
  | OpsNavOrientationMenu;

export const UNUSED_NAV_LABEL = "Resources";
export const ORIENTATION_NAV_LABEL = "Orientation";

export function getUnusedMenuItems(_role: AuthRole) {
  return [] as { href: string; label: string; exact?: boolean }[];
}

export function getOrientationMenu(_role: AuthRole) {
  return {
    variant: "items" as const,
    items: [] as { href: string; label: string }[],
    groups: [] as OrientationMenuGroup[],
  };
}

export type OrientationMenuGroup = { heading: string; items: { href: string; label: string }[] };

const ADMIN_LINKS: OpsNavEntry[] = [
  { href: "/", label: "Home", home: true },
  { href: "/schedule", label: "Schedule" },
  { href: "/volunteers", label: "Profiles" },
  { href: "/kpi", label: "KPIs" },
];

const VOLUNTEER_NAV_LINKS: OpsNavEntry[] = [
  { href: "/volunteer", label: "Home", home: true },
  { href: "/schedule", label: "Schedule" },
  { href: "/day-log", label: "Day log" },
];

function isOpsNavLink(entry: OpsNavEntry): entry is OpsNavLink {
  return !("kind" in entry);
}

export function getOpsNavLinks(role: AuthRole): OpsNavEntry[] {
  if (role === "viewer" || role === "volunteer") {
    return [...VOLUNTEER_NAV_LINKS];
  }
  return [...ADMIN_LINKS];
}

export function getOpsNavLinkLabels(role: AuthRole): string[] {
  return getOpsNavLinks(role).map((entry) =>
    isOpsNavLink(entry) ? entry.label : entry.label
  );
}
