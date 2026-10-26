import type { OnCallVolunteer } from "@/lib/db";
import {
  onCallContactLine,
  summarizeOnCallGlancePreferences,
  summarizeOnCallPlacement,
  summarizeOnCallVolunteerOutreach,
} from "@/lib/on-call-display";
import { OnCallPoolNameBadge } from "@/components/OnCallPoolNameBadge";
import { formatPortalDateSubmitted } from "@/lib/portal-time";
import { formatVolunteerDisplayName } from "@/lib/volunteer-display-name";

export function OnCallVolunteerRosterTable({
  volunteers,
  showEditLink = false,
  showAssignment = false,
  showPoolStatus = false,
  showContact = true,
}: {
  volunteers: OnCallVolunteer[];
  showEditLink?: boolean;
  /** When true, show Assigned column instead of Preferences (for assigned roster). */
  showAssignment?: boolean;
  /** When true, show pool status badge under name (Available, Shift requested, N pending). */
  showPoolStatus?: boolean;
  showContact?: boolean;
}) {
  if (volunteers.length === 0) {
    return <p className="text-sm text-slate-500">No volunteers in this list.</p>;
  }

  const tableMinWidth = showPoolStatus ? "min-w-[48rem]" : "min-w-[40rem]";

  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${tableMinWidth} text-left text-sm`}>
        <thead>
          <tr className="border-b text-[10px] uppercase tracking-wide text-slate-500">
            <th className="py-1.5 pr-3 whitespace-nowrap">Submitted</th>
            <th className="py-1.5 pr-3 min-w-[9rem]">Name</th>
            {showContact ? <th className="py-1.5 pr-3">Contact</th> : null}
            <th className="py-1.5 pr-3 whitespace-nowrap">Spanish</th>
            <th className="py-1.5 pr-3">{showAssignment ? "Assigned" : "Preferences"}</th>
            {showPoolStatus && <th className="py-1.5 pr-3 whitespace-nowrap">Shift Outreach</th>}
            {showEditLink && <th className="py-1.5 w-10" />}
          </tr>
        </thead>
        <tbody>
          {volunteers.map((v) => {
            const prefs = summarizeOnCallGlancePreferences(v);
            const assignment = summarizeOnCallPlacement(v);
            return (
              <tr key={v.id} className="border-b border-slate-100 align-top hover:bg-slate-50/80">
                <td className="py-1.5 pr-3 whitespace-nowrap text-xs text-slate-600">
                  {formatPortalDateSubmitted(v.created_at)}
                </td>
                <td className="py-1.5 pr-3">
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-medium text-slate-900">
                      {formatVolunteerDisplayName(v.name)}
                    </span>
                    {showPoolStatus && <OnCallPoolNameBadge volunteer={v} />}
                  </div>
                </td>
                {showContact ? (
                <td
                  className="py-1.5 pr-3 text-xs text-slate-600 max-w-[12rem] break-words"
                  title={onCallContactLine(v)}
                >
                  {onCallContactLine(v)}
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
                  title={showAssignment ? assignment : prefs}
                >
                  {showAssignment ? (
                    <span>{assignment}</span>
                  ) : (
                    <span className="line-clamp-2">{prefs}</span>
                  )}
                </td>
                {showPoolStatus && (
                  <td className="py-1.5 pr-3 text-xs text-violet-900">
                    <span
                      className="line-clamp-2"
                      title={summarizeOnCallVolunteerOutreach(v) ?? undefined}
                    >
                      {summarizeOnCallVolunteerOutreach(v) ?? "—"}
                    </span>
                  </td>
                )}
                {showEditLink && (
                  <td className="py-1.5 text-xs">
                    <a href={`#on-call-${v.id}`} className="text-blue-700 underline">
                      Edit
                    </a>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
