import { hasReachableContact } from "@/lib/data-hygiene";
import { formatPhoneDisplay } from "@/lib/phone-format";
import {
  profileAssignmentsSummary,
  profileAssignmentsTitle,
  profileEditLinksCompact,
  profileRolesCompact,
} from "@/lib/volunteer-profile-display";
import {
  profileAnchorId,
  roleLabel,
  volunteerProfilePrimaryUsageLink,
  type VolunteerProfile,
} from "@/lib/volunteer-profiles";
import { formatVolunteerDisplayName } from "@/lib/volunteer-display-name";
import { UNASSIGNED_SLOT_TEXT_CLASS } from "@/lib/event-dates";
import { VolunteerProfileEditMenu } from "@/components/VolunteerProfileEditMenu";
import Link from "next/link";

export function VolunteerProfilesGlanceTable({
  profiles,
  write,
  showContact = true,
}: {
  profiles: VolunteerProfile[];
  write: boolean;
  showContact?: boolean;
}) {
  if (profiles.length === 0) {
    return <p className="text-sm text-slate-500">No volunteers recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
            <th className="py-1.5 pr-3 min-w-[9rem]">Name</th>
            {showContact ? (
              <>
                <th className="py-1.5 pr-3 whitespace-nowrap">Phone</th>
                <th className="py-1.5 pr-3 min-w-[8rem]">Email</th>
              </>
            ) : null}
            <th className="py-1.5 pr-3">Roles</th>
            <th className="py-1.5 pr-3">On file</th>
            <th className="py-1.5 w-14">Edit</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => {
            const editLinks = profileEditLinksCompact(profile);
            const primaryUsage = volunteerProfilePrimaryUsageLink(profile);
            const missingContact = showContact && !hasReachableContact(profile);
            const assignments = profileAssignmentsSummary(profile);
            const assignmentsTitle = profileAssignmentsTitle(profile);
            const displayName = formatVolunteerDisplayName(profile.name);

            return (
              <tr
                key={profile.key}
                id={profileAnchorId(profile.key)}
                className={`scroll-mt-6 border-b border-slate-100 align-top hover:bg-slate-50/80 ${
                  missingContact ? "bg-red-50/50" : ""
                }`}
              >
                <td className="py-1.5 pr-3 font-medium text-slate-900">
                  {primaryUsage ? (
                    <Link
                      href={primaryUsage.href}
                      className="text-blue-800 underline decoration-blue-300 underline-offset-2 hover:decoration-blue-600"
                      title={`Open ${primaryUsage.label}`}
                    >
                      {displayName}
                    </Link>
                  ) : (
                    displayName
                  )}
                </td>
                {showContact ? (
                <td className="py-1.5 pr-3 text-xs tabular-nums text-slate-600 whitespace-nowrap">
                  {profile.phone.trim() ? (
                    formatPhoneDisplay(profile.phone)
                  ) : (
                    <span className={UNASSIGNED_SLOT_TEXT_CLASS}>No phone</span>
                  )}
                </td>
                ) : null}
                {showContact ? (
                <td
                  className="py-1.5 pr-3 text-xs text-slate-600 max-w-[11rem] truncate"
                  title={profile.email.trim() || undefined}
                >
                  {profile.email.trim() ? (
                    profile.email.trim()
                  ) : (
                    <span className={UNASSIGNED_SLOT_TEXT_CLASS}>No email</span>
                  )}
                </td>
                ) : null}
                <td
                  className="py-1.5 pr-3 text-xs text-slate-600 max-w-[9rem]"
                  title={profile.roles.map((role) => roleLabel(role)).join(", ")}
                >
                  <span className="line-clamp-2">{profileRolesCompact(profile.roles)}</span>
                </td>
                <td
                  className="py-1.5 pr-3 text-xs text-slate-600 max-w-[14rem]"
                  title={assignmentsTitle}
                >
                  <span className="line-clamp-2">{assignments}</span>
                </td>
                <td className="py-1.5 text-xs whitespace-nowrap">
                  <VolunteerProfileEditMenu
                    editLinks={editLinks}
                    profile={profile}
                    write={write}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
