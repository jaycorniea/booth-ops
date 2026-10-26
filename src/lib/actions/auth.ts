"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearAuthentication,
  commitAuthenticatedLogin,
  hasAdminShell,
  homePathForRole,
  isAdmin,
  setAuthenticated,
  verifyPassword,
} from "../auth";
import type { AuthRole } from "../auth-types";
import {
  parsePortalWindowSim,
  PORTAL_WINDOW_SIM_COOKIE,
  resolvePortalAsOf,
} from "@/lib/portal-window-sim";
import type { PortalWindow } from "../portal-windows";
import { logPortalEvent } from "../instrumentation";
import { buildBrowserClientGeo, normalizeAccuracy } from "../browser-geo";
import { applyBrowserSessionGeo } from "../portal-analytics";
import { ensureSessionIdCookie, getVisitorSessionId } from "../visitor-session";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "").trim();
  const { after } = await import("next/server");

  const role = verifyPassword(password);

  if (!role) {
    after(async () => {
      await logPortalEvent({ eventType: "auth", action: "login_failed" });
    });
    redirect("/login?error=1");
  }

  // Prod Turso session/geo/analytics can exceed Vercel's 10s limit — cookies first, DB after response.
  await commitAuthenticatedLogin(role);
  const sessionId = await ensureSessionIdCookie();
  const loginAction =
    role === "admin"
      ? "login_admin"
      : role === "viewer"
        ? "login_viewer"
        : role === "volunteer"
          ? "login_volunteer"
          : "login";
  after(async () => {
    const ua = (await headers()).get("user-agent") ?? "";
    const { getClientIp } = await import("../client-ip");
    const { createPortalSession } = await import("../portal-analytics");
    await createPortalSession(sessionId, ua, {
      authRole: role,
      clientIp: await getClientIp(),
    });
    await logPortalEvent({
      eventType: "auth",
      action: loginAction,
      detail: { role },
    });
  });
  redirect(homePathForRole(role));
}

export async function logoutAction() {
  await logPortalEvent({ eventType: "auth", action: "logout" });
  await clearAuthentication();
  redirect("/login");
}

export async function switchAuthRoleAction(role: AuthRole) {
  if (!(await hasAdminShell())) {
    redirect("/?error=admin_required");
  }
  await setAuthenticated(role);
  const { enrichVisitorSession } = await import("../visitor-session");
  await enrichVisitorSession({ authRole: role });
  await logPortalEvent({
    eventType: "auth",
    action: "role_switch",
    detail: { role },
  });
  redirect(homePathForRole(role));
}

export async function setPortalWindowSimAction(window: PortalWindow | null) {
  if (!(await isAdmin())) {
    redirect("/?error=admin_required");
  }

  const jar = await cookies();
  if (window && parsePortalWindowSim(window)) {
    jar.set(PORTAL_WINDOW_SIM_COOKIE, window, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
  } else {
    jar.delete(PORTAL_WINDOW_SIM_COOKIE);
  }

  revalidatePath("/", "layout");

  const referer = (await headers()).get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      redirect(url.pathname + url.search);
    } catch {
      redirect("/");
    }
  }
  redirect("/");
}

export async function recordPageViewAction(path: string) {
  await recordNavigationAction({ path, method: "page_view" });
}

export async function submitBrowserGeoAction(input: {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}): Promise<{ ok: boolean; reason?: string }> {
  const { ensureVisitorSession } = await import("../visitor-session");
  await ensureVisitorSession();
  const sessionId = await getVisitorSessionId();
  if (!sessionId) return { ok: false, reason: "no_session" };

  const geo = await buildBrowserClientGeo(input);
  if (!geo) return { ok: false, reason: "invalid_coords" };

  const accuracy = normalizeAccuracy(input.accuracy);
  await applyBrowserSessionGeo(sessionId, geo, accuracy);
  await logPortalEvent({
    eventType: "api",
    action: "geo.browser",
    detail: {
      accuracy,
      latitude: geo.latitude,
      longitude: geo.longitude,
      city: geo.city,
    },
  });

  return { ok: true };
}

export async function recordNavigationAction(params: {
  path: string;
  method: string;
  label?: string;
  from?: string | null;
  href?: string | null;
  referrer?: string | null;
}) {
  const { getAuthRole } = await import("../auth");
  const { ensureVisitorSession, enrichVisitorSession, getVisitorSessionId } = await import(
    "../visitor-session"
  );
  const { getClientIp } = await import("../client-ip");

  const role = await getAuthRole();
  const clientIp = await getClientIp();
  await ensureVisitorSession();
  const isEntry = params.method === "entry";
  await enrichVisitorSession({
    authRole: role,
    clientIp,
    entryPath: isEntry ? params.path : null,
    referrer: params.referrer ?? null,
  });

  const { after } = await import("next/server");

  after(async () => {
    const eventDate = params.path.match(/\/day\/(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
    const eventType = params.method === "page_view" ? "page_view" : "navigation";
    await logPortalEvent({
      eventType,
      action: params.method,
      path: params.path,
      eventDate,
      detail: {
        label: params.label ?? null,
        from: params.from ?? null,
        href: params.href ?? null,
        referrer: params.referrer ?? null,
      },
    });
  });
}
