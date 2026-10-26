import { PiAdminResponsePanel } from "@/components/PiAdminResponsePanel";
import { respondCaptainFeedbackAction } from "@/lib/actions";
import type { CaptainFeedback } from "@/lib/db";

export function FeedbackAdminResponsePanel({
  entry,
  isAdmin,
}: {
  entry: CaptainFeedback;
  isAdmin: boolean;
}) {
  return (
    <PiAdminResponsePanel
      entry={entry}
      isAdmin={isAdmin}
      action={respondCaptainFeedbackAction.bind(null, entry.id)}
      placeholder="Reply visible to all captains."
      compactDisplay
      adminFormCollapsed
    />
  );
}