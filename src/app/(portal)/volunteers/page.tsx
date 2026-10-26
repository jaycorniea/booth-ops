import { PortalBanner, PortalQueryBanner } from "@/components/PortalBanner";
import { VolunteerProfileAlphaNav } from "@/components/VolunteerProfileAlphaNav";
import { VolunteerProfilesGlanceTable } from "@/components/VolunteerProfilesGlanceTable";
import { Card } from "@/components/ui";
import { PORTAL_VOLUNTEERS_ERRORS } from "@/lib/portal-query-feedback";
import { canSeeContact, canWrite } from "@/lib/auth";
import { listVolunteerProfiles } from "@/lib/volunteer-profiles";

export default async function VolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ on_call_added?: string; on_call_exists?: string; error?: string }>;
}) {
  const query = await searchParams;
  const [profiles, write, showContact] = await Promise.all([
    listVolunteerProfiles(),
    canWrite(),
    canSeeContact(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Volunteer profiles</h2>
        <p className="text-sm text-slate-600">
          Deduped across shifts, interested, on-call, and Day Captains — edit contact at the source.
        </p>
      </div>

      {query.on_call_added === "1" && (
        <PortalBanner tone="success" className="px-3 py-2">
          Volunteer added to the on-call pool.
        </PortalBanner>
      )}
      {query.on_call_exists === "1" && (
        <PortalBanner tone="warning" className="px-3 py-2">
          That volunteer is already in the on-call pool.
        </PortalBanner>
      )}
      <PortalQueryBanner
        code={query.error}
        messages={PORTAL_VOLUNTEERS_ERRORS}
        className="px-3 py-2"
      />

      <Card title={`Profiles at a glance (${profiles.length})`}>
        {profiles.length > 0 ? (
          <>
            <p className="mb-2 text-xs text-slate-500">
              A–Z jump below. Name opens the most relevant place (captain day, shift day, on-call, or
              interested).
              {showContact
                ? " Red rows need phone or email — use Edit to update at the source."
                : ""}
            </p>
            <VolunteerProfileAlphaNav profiles={profiles} />
            <VolunteerProfilesGlanceTable
              profiles={profiles}
              write={write}
              showContact={showContact}
            />
          </>
        ) : (
          <VolunteerProfilesGlanceTable
            profiles={profiles}
            write={write}
            showContact={showContact}
          />
        )}
      </Card>
    </div>
  );
}
