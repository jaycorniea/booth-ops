import type {
  OpsNavLink,
  OpsNavCaptainMoreMenu,
  OpsNavUnusedMenu,
  OpsNavOrientationMenu,
} from "@/lib/ops-nav";
import { dayDashboardHref } from "@/lib/day-routes";
import { parseCaptainPickedDayKey } from "@/lib/captain-picked-day";

export const CAPTAIN_MORE_NAV_LABEL = "More";
export const CAPTAIN_EXTRAS_NAV_LABEL = CAPTAIN_MORE_NAV_LABEL;

export type CaptainNavMenuItem = {
  href: string;
  label: string;
};

export type CaptainNavEntry =
  | OpsNavLink
  | OpsNavCaptainMoreMenu
  | OpsNavUnusedMenu
  | OpsNavOrientationMenu;

export const CAPTAIN_PICK_DAY_HREF = "/#event-days";
export const CAPTAIN_PICK_DAY_HASH = "event-days";

export function resolveCaptainShiftSheetHref(pickedKey?: string | null): string {
  const parsed = parseCaptainPickedDayKey(pickedKey);
  if (!parsed) return CAPTAIN_PICK_DAY_HREF;
  return dayDashboardHref(parsed.date, parsed.captainSlot);
}

export function isCaptainShiftSheetDayHref(href: string): boolean {
  return href.startsWith("/day/");
}

export function getCaptainMoreMenuItems(): CaptainNavMenuItem[] {
  return [
    { href: "/day-log", label: "Day log" },
    { href: "/more/add-volunteer", label: "Add a volunteer" },
    { href: "/kpi", label: "KPIs" },
  ];
}

export function getCaptainExtrasMenuItems(): CaptainNavMenuItem[] {
  return getCaptainMoreMenuItems();
}

export function getViewerExtrasMenuItems(): CaptainNavMenuItem[] {
  return [];
}

export function getCaptainNavLinks(): CaptainNavEntry[] {
  return [
    { href: "/", label: "Home", home: true },
    { href: "/schedule", label: "Schedule" },
    { href: "/volunteers", label: "Profiles" },
    { kind: "captain-more-menu", label: CAPTAIN_MORE_NAV_LABEL },
  ];
}
