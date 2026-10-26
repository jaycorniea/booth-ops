import { PortalQueryBanner } from "@/components/PortalBanner";
import { VolunteerProfileAlphaNav } from "@/components/VolunteerProfileAlphaNav";
import { VolunteerProfilesGlanceTable } from "@/components/VolunteerProfilesGlanceTable";
import { Card } from "@/components/ui";
import { PORTAL_VOLUNTEERS_ERRORS } from "@/lib/portal-query-feedback";
import { canSeeContact } from "@/lib/auth";
import { listVolunteerProfiles } from "@/lib/volunteer-profiles";

export default async function VolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const [profiles, showContact] = await Promise.all([
    listVolunteerProfiles(),
    canSeeContact(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Volunteer profiles</h2>
        <p className="text-sm text-slate-600">
          Deduped across shifts and Day Captains — edit contact at the source.
        </p>
      </div>

      <PortalQueryBanner
        code={query.error}
        messages={PORTAL_VOLUNTEERS_ERRORS}
        className="px-3 py-2"
      />

      <Card title={`Profiles at a glance (${profiles.length})`}>
        {profiles.length > 0 ? (
          <>
            <p className="mb-2 text-xs text-slate-500">
              A–Z jump below. Name opens the captain day or the shift day.
              {showContact
                ? " Red rows need phone or email — use Edit to update at the source."
                : ""}
            </p>
            <VolunteerProfileAlphaNav profiles={profiles} />
            <VolunteerProfilesGlanceTable profiles={profiles} showContact={showContact} />
          </>
        ) : (
          <VolunteerProfilesGlanceTable profiles={profiles} showContact={showContact} />
        )}
      </Card>
    </div>
  );
}
