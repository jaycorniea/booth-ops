import type { BrowserContext } from "@playwright/test";

const PORTAL_ORIGIN = process.env.BASE_URL ?? "http://127.0.0.1:3010";

export async function setPortalAuth(
  context: BrowserContext,
  role: "captain" | "admin" | "viewer" | "volunteer"
) {
  await context.addCookies([
    {
      name: "booth_portal_auth",
      value: role,
      url: PORTAL_ORIGIN,
    },
  ]);
}