import { PiAdminResponsePanel } from "@/components/PiAdminResponsePanel";
import { respondIssueAction } from "@/lib/actions";
import type { Issue } from "@/lib/db";

export function IssueAdminResponsePanel({
  issue,
  isAdmin,
}: {
  issue: Issue;
  isAdmin: boolean;
}) {
  return (
    <PiAdminResponsePanel
      entry={issue}
      isAdmin={isAdmin}
      action={respondIssueAction.bind(null, issue.id)}
      placeholder="Reply to this issue — visible to all Day Captains on the issue log."
    />
  );
}