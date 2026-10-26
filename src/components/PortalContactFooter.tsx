"use client";

import { CoordinatorContactStrip } from "@/components/CoordinatorContactStrip";
import { portalContactFooterExcluded } from "@/lib/portal-contact-footer";
import { usePathname } from "next/navigation";

/** Coordinator contact strip — bottom of authenticated portal pages. */
export function PortalContactFooter() {
  const pathname = usePathname();
  if (portalContactFooterExcluded(pathname)) {
    return null;
  }

  return (
    <div className="mt-6">
      <CoordinatorContactStrip alwaysShow />
    </div>
  );
}
