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

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "").trim();
  const role = verifyPassword(password);

  if (!role) {
    redirect("/login?error=1");
  }

  await commitAuthenticatedLogin(role);
  redirect(homePathForRole(role));
}

export async function logoutAction() {
  await clearAuthentication();
  redirect("/login");
}

export async function switchAuthRoleAction(role: AuthRole) {
  if (!(await hasAdminShell())) {
    redirect("/?error=admin_required");
  }
  await setAuthenticated(role);
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
