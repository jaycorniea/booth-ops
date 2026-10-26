import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type AuthRole } from "./auth-types";
import { PORTAL_WINDOW_SIM_COOKIE } from "./portal-window-sim";

export type { AuthRole } from "./auth-types";
export { ROLE_LABELS } from "./auth-types";

const COOKIE_NAME = "booth_portal_auth";
export const ADMIN_SHELL_COOKIE = "booth_portal_admin_shell";
const LEGACY_CAPTAIN_DATE_COOKIE = "booth_portal_captain_date";

export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

const REQUIRED_PRODUCTION_PASSWORDS = [
  "ADMIN_PASSWORD",
  "DAY_CAPTAIN_PASSWORD",
  "VOLUNTEER_PORTAL_PASSWORD",
] as const;

function envPassword(keys: string[]): string {
  for (const key of keys) {
    const val = process.env[key]?.trim();
    if (val) return val;
  }
  return "";
}

export function assertAuthEnv(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const missing = REQUIRED_PRODUCTION_PASSWORDS.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(
      `Booth Ops refuses to start in production without passwords: ${missing.join(", ")}`
    );
  }
}

export function getDayCaptainPassword(): string {
  return envPassword(["DAY_CAPTAIN_PASSWORD", "PORTAL_PASSWORD"]);
}

export function getAdminPassword(): string {
  return envPassword(["ADMIN_PASSWORD", "PORTAL_ADMIN_PASSWORD"]);
}

export function getReadOnlyPassword(): string {
  return envPassword(["READ_ONLY_PASSWORD", "PORTAL_READ_ONLY_PASSWORD"]);
}

export function getVolunteerPortalPassword(): string {
  return envPassword(["VOLUNTEER_PORTAL_PASSWORD", "VOLUNTEER_PASSWORD"]);
}

export async function getAuthRole(): Promise<AuthRole | null> {
  const jar = await cookies();
  const value = jar.get(COOKIE_NAME)?.value;
  if (value === "admin" || value === "captain" || value === "viewer" || value === "volunteer") {
    return value;
  }
  if (value === "authenticated") return "captain";
  return null;
}

export async function isAdmin(): Promise<boolean> {
  return (await getAuthRole()) === "admin";
}

export async function canWrite(): Promise<boolean> {
  const role = await getAuthRole();
  return role === "admin" || role === "captain";
}

export async function canContact(): Promise<boolean> {
  return canSeeContact();
}

export async function canSeeContact(): Promise<boolean> {
  const role = await getAuthRole();
  return role === "admin" || role === "captain";
}

export async function canWriteDayLog(): Promise<boolean> {
  const role = await getAuthRole();
  return role === "admin" || role === "captain" || role === "volunteer";
}

export async function requireWriteAccess(): Promise<void> {
  if (!(await canWrite())) {
    redirect("/?error=readonly");
  }
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    redirect("/?error=admin_required");
  }
}

export async function requireCaptainAccess(): Promise<void> {
  const role = await getAuthRole();
  if (role !== "admin" && role !== "captain") {
    redirect("/?error=access_required");
  }
}

export async function hasAdminShell(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(ADMIN_SHELL_COOKIE)?.value === "1";
}

export async function setAdminShell(): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_SHELL_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function setAuthenticated(role: AuthRole): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearAuthentication(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  jar.delete(ADMIN_SHELL_COOKIE);
  jar.delete(LEGACY_CAPTAIN_DATE_COOKIE);
  jar.delete(PORTAL_WINDOW_SIM_COOKIE);
}

export async function commitAuthenticatedLogin(role: AuthRole): Promise<void> {
  if (role === "admin") {
    await setAdminShell();
  }
  await setAuthenticated(role);
}

export function verifyPassword(input: string): AuthRole | null {
  const password = input.trim();
  if (!password) return null;
  const admin = getAdminPassword();
  const captain = getDayCaptainPassword();
  const volunteer = getVolunteerPortalPassword();
  const readOnly = getReadOnlyPassword();
  if (admin && password === admin) return "admin";
  if (captain && password === captain) return "captain";
  if (volunteer && password === volunteer) return "volunteer";
  if (readOnly && password === readOnly) return "viewer";
  return null;
}

export function homePathForRole(role: AuthRole): string {
  return role === "volunteer" || role === "viewer" ? "/volunteer" : "/";
}
