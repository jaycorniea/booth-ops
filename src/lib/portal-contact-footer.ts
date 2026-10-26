/** Paths that already surface booth contacts — skip duplicate footer strip. */
export const PORTAL_CONTACT_FOOTER_EXCLUDED_PATHS = ["/resources"] as const;

export function portalContactFooterExcluded(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const normalized = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  return PORTAL_CONTACT_FOOTER_EXCLUDED_PATHS.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}
