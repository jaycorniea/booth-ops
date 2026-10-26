import type { PortalActivitySummaryStop } from "@/lib/portal-activity";
import { PortalActivitySummaryTrail } from "./PortalActivitySummaryTrail";

export function PortalDayActivitySummary({
  nav,
  activity,
}: {
  nav: PortalActivitySummaryStop[];
  activity: PortalActivitySummaryStop[];
}) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <PortalActivitySummaryTrail stops={nav} className="text-xs" />
      <PortalActivitySummaryTrail stops={activity} className="text-xs" />
    </span>
  );
}