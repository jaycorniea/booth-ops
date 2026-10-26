import { headers } from "next/headers";
import { getAuthRole } from "./auth";
import type { AuthRole } from "./auth-types";
import { createPortalSession, insertPortalEvent, type PortalEventType } from "./portal-analytics";
import { getClientIp } from "./client-ip";
import { getVisitorSessionId } from "./visitor-session";

function authRoleFromCookieHeader(cookieHeader: string | null): AuthRole | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)booth_portal_auth=([^;]+)/);
  const value = match?.[1] ? decodeURIComponent(match[1]).trim() : "";
  if (value === "admin" || value === "captain" || value === "viewer" || value === "volunteer") {
    return value;
  }
  if (value === "authenticated") return "captain";
  return null;
}

/**
 * Portal instrumentation (captain + admin password roles).
 *
 * Each browser gets an anonymous session id (cookie booth_portal_sid). Events are
 * stored in portal_events for event-week ops review and post-event export.
 *
 * Recommended metrics to watch (Reports → Portal activity):
 * - activeSessions / sessionsToday — concurrent captain devices
 * - loginsToday — password shares / session churn
 * - mutationsToday by action — roster edits, tally saves, EOD submits
 * - navigation events (link, typed URL, entry) — Admin → Nav log
 * - page_views on /day/[date] during shift windows — captain engagement
 * - on_call.assign + shift.update_shift same session — no-show workflow
 * - export.* — admin activity spikes
 *
 * Do not log: passwords, full volunteer PII, issue body text (use ids/counts only).
 */

export async function logPortalEvent(params: {
  eventType: PortalEventType;
  action: string;
  eventDate?: string | null;
  path?: string | null;
  detail?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const sessionId = await getVisitorSessionId();
    if (!sessionId) return;
    const clientIp = await getClientIp();
    const ua = (await headers()).get("user-agent") ?? "";
    await createPortalSession(sessionId, ua, {
      clientIp,
      authRole: await getAuthRole(),
    });
    await insertPortalEvent({
      sessionId,
      eventType: params.eventType,
      action: params.action,
      eventDate: params.eventDate,
      path: params.path,
      detail: params.detail,
      clientIp,
    });
  } catch (err) {
    console.error("[portal-instrumentation]", params.action, err);
  }
}

export function sessionIdFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)booth_portal_sid=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function logPortalEventForRequest(
  request: { headers: Headers },
  params: {
    eventType: PortalEventType;
    action: string;
    eventDate?: string | null;
    path?: string | null;
    detail?: Record<string, unknown> | null;
  }
): Promise<void> {
  try {
    const cookieHeader = request.headers.get("cookie");
    const sessionId = sessionIdFromCookieHeader(cookieHeader);
    if (!sessionId) return;
    const forwarded = request.headers.get("x-forwarded-for");
    const clientIp =
      forwarded?.split(",")[0]?.trim().slice(0, 64) ??
      request.headers.get("x-real-ip")?.trim().slice(0, 64) ??
      (process.env.NODE_ENV === "development" ? "127.0.0.1" : null);
    const ua = request.headers.get("user-agent") ?? "";
    await createPortalSession(sessionId, ua, {
      clientIp,
      authRole: authRoleFromCookieHeader(cookieHeader),
    });
    await insertPortalEvent({
      sessionId,
      eventType: params.eventType,
      action: params.action,
      eventDate: params.eventDate,
      path: params.path,
      detail: params.detail,
      clientIp,
    });
  } catch (err) {
    console.error("[portal-instrumentation]", params.action, err);
  }
}