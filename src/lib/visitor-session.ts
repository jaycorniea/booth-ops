import { cookies, headers } from "next/headers";
import { getClientIp } from "./client-ip";
import {
  createPortalSession,
  endPortalSession,
  SESSION_ID_COOKIE,
  updatePortalSessionMeta,
} from "./portal-analytics";
import { captureSessionGeo } from "./session-geo";
import type { AuthRole } from "./auth-types";

export function newSessionId(): string {
  return crypto.randomUUID();
}

export async function getVisitorSessionId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_ID_COOKIE)?.value?.trim() || null;
}

/** Set booth_portal_sid on this response — no Turso. Login must do this before redirect. */
export async function ensureSessionIdCookie(): Promise<string> {
  const existing = await getVisitorSessionId();
  if (existing) return existing;
  const id = newSessionId();
  await setVisitorSessionCookie(id);
  return id;
}

export async function setVisitorSessionCookie(sessionId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_ID_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
}

export async function clearVisitorSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_ID_COOKIE);
}

export async function startVisitorSession(
  userAgent?: string,
  meta?: { authRole?: AuthRole | null }
): Promise<string> {
  const id = newSessionId();
  const ua = userAgent ?? (await headers()).get("user-agent") ?? "";
  const clientIp = await getClientIp();
  await createPortalSession(id, ua, {
    clientIp,
    authRole: meta?.authRole ?? null,
  });
  await captureSessionGeo(id);
  await setVisitorSessionCookie(id);
  return id;
}

export async function enrichVisitorSession(meta: {
  entryPath?: string | null;
  referrer?: string | null;
  authRole?: AuthRole | null;
  clientIp?: string | null;
}): Promise<void> {
  const id = await getVisitorSessionId();
  if (!id) return;
  const clientIp = meta.clientIp ?? (await getClientIp());
  await updatePortalSessionMeta(id, {
    clientIp,
    authRole: meta.authRole ?? null,
    entryPath: meta.entryPath ?? null,
    referrer: meta.referrer ?? null,
  });
  if (process.env.NODE_ENV !== "development") {
    await captureSessionGeo(id);
  }
}

/** Resume or create a browser session for an already-authenticated user. */
export async function ensureVisitorSession(): Promise<string> {
  const existing = await getVisitorSessionId();
  const ua = (await headers()).get("user-agent") ?? "";
  if (existing) {
    const clientIp = await getClientIp();
    const { getAuthRole } = await import("./auth");
    await createPortalSession(existing, ua, {
      clientIp,
      authRole: await getAuthRole(),
    });
    return existing;
  }
  const { getAuthRole } = await import("./auth");
  return startVisitorSession(ua, { authRole: await getAuthRole() });
}

export async function endVisitorSession(): Promise<void> {
  const id = await getVisitorSessionId();
  if (id) await endPortalSession(id);
  await clearVisitorSessionCookie();
}