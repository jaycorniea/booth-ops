import { onCallGlancePoolBadge } from "@/lib/on-call-display";
import type { OnCallVolunteer } from "@/lib/db";

export function OnCallPoolNameBadge({
  volunteer,
}: {
  volunteer: Pick<OnCallVolunteer, "status" | "pending_shift_requests">;
}) {
  const badge = onCallGlancePoolBadge(volunteer);
  if (!badge) return null;

  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${badge.className}`}>
      {badge.label}
    </span>
  );
}