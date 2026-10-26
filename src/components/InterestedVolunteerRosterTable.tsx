import type { InterestedVolunteer } from "@/lib/db";
import {
  interestedContactLine,
  summarizeInterestedAvailabilityCompact,
  summarizeInterestedPlacement,
} from "@/lib/interested-volunteer-display";
import { formatPortalDateSubmitted } from "@/lib/portal-time";
import { formatVolunteerDisplayName } from "@/lib/volunteer-display-name";

export function InterestedVolunteerRosterTable({
  volunteers,
  showEditLink = false,
  showAssignLink = false,
  showAssignment = false,
  showContact = true,
}: {
  volunteers: InterestedVolunteer[];
  showEditLink?: boolean;
  /** Assign link (left of Edit) — opens assign page for open preferred slots. */
  showAssignLink?: boolean;
  /** When true, show Assigned column instead of Preferences (for placed roster). */
  showAssignment?: boolean;
  showContact?: boolean;
}) {
  if (volunteers.length === 0) {
    return <p className="text-sm text-slate-500">No volunteers in this list.</p>;
  }

  const showActions = showAssignLink || showEditLink;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead>
          <tr className="border-b text-[10px] uppercase tracking-wide text-slate-500">
            <th className="py-1.5 pr-3 whitespace-nowrap">Submitted</th>
            <th className="py-1.5 pr-3 min-w-[9rem]">Name</th>
            {showContact ? <th className="py-1.5 pr-3">Contact</th> : null}
            <th className="py-1.5 pr-3 whitespace-nowrap">Spanish</th>
            <th className="py-1.5 pr-3">{showAssignment ? "Assigned" : "Preferences"}</th>
            {showActions ? <th className="py-1.5 pr-0 whitespace-nowrap" /> : null}
          </tr>
        </thead>
        <tbody>
          {volunteers.map((v) => {
            const prefs = summarizeInterestedAvailabilityCompact(v);
            return (
              <tr key={v.id} className="border-b border-slate-100 align-top hover:bg-slate-50/80">
                <td className="py-1.5 pr-3 whitespace-nowrap text-xs text-slate-600">
                  {formatPortalDateSubmitted(v.created_at)}
                </td>
                <td className="py-1.5 pr-3 font-medium text-slate-900">
                  {formatVolunteerDisplayName(v.name)}
                </td>
                {showContact ? (
                <td
                  className="py-1.5 pr-3 text-xs text-slate-600 max-w-[12rem] break-words"
                  title={interestedContactLine(v)}
                >
                  {interestedContactLine(v)}
                </td>
                ) : null}
                <td className="py-1.5 pr-3 text-xs whitespace-nowrap text-slate-700">
                  {v.bilingual === 1 ? (
                    <span className="font-medium text-slate-900">Yes</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td
                  className="py-1.5 pr-3 text-xs text-slate-600"
                  title={showAssignment ? summarizeInterestedPlacement(v) : prefs}
                >
                  {showAssignment ? (
                    <span>{summarizeInterestedPlacement(v)}</span>
                  ) : (
                    <>
                      <span className="line-clamp-2">{prefs}</span>
                      {v.source ? (
                        <span className="mt-0.5 block text-slate-400">via {v.source}</span>
                      ) : null}
                    </>
                  )}
                </td>
                {showActions ? (
                  <td className="py-1.5 text-xs whitespace-nowrap">
                    {showAssignLink ? (
                      <a
                        href={`/interested/${v.id}/assign`}
                        className="text-blue-700 underline"
                      >
                        Assign
                      </a>
                    ) : null}
                    {showAssignLink && showEditLink ? (
                      <span className="text-slate-300"> · </span>
                    ) : null}
                    {showEditLink ? (
                      <a href={`#interested-${v.id}`} className="text-blue-700 underline">
                        Edit
                      </a>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
