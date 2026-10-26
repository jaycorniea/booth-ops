import { ADMIN_SHELL_COOKIE } from "@/lib/auth";
import type { AuthRole } from "@/lib/auth-types";
import { captainCanUseDayTools, getPortalWindow } from "@/lib/portal-windows";
import {
  parsePortalWindowSim,
  PORTAL_WINDOW_SIM_COOKIE,
  resolvePortalAsOf,
} from "@/lib/portal-window-sim";
import {
  CAPTAIN_PICKED_DAY_COOKIE,
  CAPTAIN_PICKED_DAY_COOKIE_OPTIONS,
  captainPickedDayKeyFromPath,
} from "@/lib/captain-picked-day";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC = ["/login", "/api/health"];
const ADMIN_ONLY = ["/event-settings"];
const WRITE_API: string[] = [];
const VOLUNTEER_ALLOWED_PREFIXES = [
  "/volunteer",
  "/schedule",
  "/day-log",
  "/day",
  "/api/logout",
];
const AUTH_COOKIE = "booth_portal_auth";

function portalAsOfFromRequest(request: NextRequest): Date {
  const hasShell = request.cookies.get(ADMIN_SHELL_COOKIE)?.value === "1";
  if (!hasShell) return new Date();
  const sim = parsePortalWindowSim(request.cookies.get(PORTAL_WINDOW_SIM_COOKIE)?.value);
  return resolvePortalAsOf(sim);
}

function getAuthRole(request: NextRequest): AuthRole | null {
  const value = request.cookies.get(AUTH_COOKIE)?.value;
  if (value === "admin" || value === "captain" || value === "viewer" || value === "volunteer") {
    return value;
  }
  if (value === "authenticated") return "captain";
  return null;
}

function volunteerMayAccess(pathname: string): boolean {
  return VOLUNTEER_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  if (pathname === "/captain" || pathname.startsWith("/captain/")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const role = getAuthRole(request);
  const portalAsOf = portalAsOfFromRequest(request);
  if (!role) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  if (role === "volunteer" && !volunteerMayAccess(pathname)) {
    return NextResponse.redirect(new URL("/volunteer", request.url));
  }

  if (ADMIN_ONLY.some((p) => pathname.startsWith(p)) && role !== "admin") {
    const home = new URL(role === "volunteer" ? "/volunteer" : "/", request.url);
    home.searchParams.set("error", "admin_required");
    return NextResponse.redirect(home);
  }

  if (role === "captain" && !captainCanUseDayTools(portalAsOf)) {
    if (pathname !== "/") {
      const home = new URL("/", request.url);
      home.searchParams.set("captain_window", getPortalWindow(portalAsOf));
      return NextResponse.redirect(home);
    }
  }

  if (
    (role === "viewer" || role === "volunteer") &&
    request.method === "POST" &&
    WRITE_API.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.json({ error: "Read-only access" }, { status: 403 });
  }

  const response = NextResponse.next();
  if (role === "captain") {
    const pickedKey = captainPickedDayKeyFromPath(pathname);
    if (pickedKey) {
      response.cookies.set(CAPTAIN_PICKED_DAY_COOKIE, pickedKey, CAPTAIN_PICKED_DAY_COOKIE_OPTIONS);
    }
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
