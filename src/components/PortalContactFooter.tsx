import { CoordinatorContactStrip } from "@/components/CoordinatorContactStrip";

/** Coordinator contact strip — bottom of authenticated portal pages. */
export function PortalContactFooter() {
  return (
    <div className="mt-6">
      <CoordinatorContactStrip alwaysShow />
    </div>
  );
}
