import { cookies } from "next/headers";
import { hasAdminShell } from "@/lib/auth";
import type { PortalWindow } from "@/lib/portal-windows";
import {
  effectivePortalWindow,
  parsePortalWindowSim,
  PORTAL_WINDOW_SIM_COOKIE,
  resolvePortalAsOf,
} from "@/lib/portal-window-sim";

export async function getPortalWindowSim(): Promise<PortalWindow | null> {
  if (!(await hasAdminShell())) return null;
  const jar = await cookies();
  return parsePortalWindowSim(jar.get(PORTAL_WINDOW_SIM_COOKIE)?.value);
}

/** Portal clock for window gates — honors admin window sim when admin shell is active. */
export async function getPortalAsOf(): Promise<Date> {
  const sim = await getPortalWindowSim();
  return resolvePortalAsOf(sim);
}

export async function getEffectivePortalWindow(): Promise<PortalWindow> {
  const sim = await getPortalWindowSim();
  return effectivePortalWindow(sim);
}
