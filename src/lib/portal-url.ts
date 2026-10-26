export const CANONICAL_PORTAL_URL = "http://127.0.0.1:3010";

export function portalBaseUrl(
  envUrl = process.env.NEXT_PUBLIC_PORTAL_URL
): string {
  return (envUrl ?? CANONICAL_PORTAL_URL).replace(/\/$/, "");
}
