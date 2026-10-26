import { ContactEmail, ContactPhone } from "@/components/ContactField";
import { InterestedVolunteerAvailabilityFields } from "@/components/InterestedVolunteerAvailabilityFields";
import { InterestedVolunteerRosterTable } from "@/components/InterestedVolunteerRosterTable";
import { Card } from "@/components/ui";
import { hasReachableContact } from "@/lib/data-hygiene";
import {
  deleteInterestedVolunteerAction,
  updateInterestedVolunteerAction,
} from "@/lib/actions";
import { canWrite } from "@/lib/auth";
import { listInterestedVolunteers } from "@/lib/db";
import {
  interestedStatusBadge,
  summarizeInterestedAvailability,
} from "@/lib/interested-volunteer-display";
import { getEventDates, UNASSIGNED_SLOT_CLASS } from "@/lib/event-dates";
import { formatPortalDateSubmitted, formatPortalTimestampCompact } from "@/lib/portal-time";
import { formatVolunteerDisplayName } from "@/lib/volunteer-display-name";
import Link from "next/link";

const fieldClass =
  "w-full rounded border border-slate-300 px-1.5 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function StatusBadge({ status }: { status: string }) {
  const badge = interestedStatusBadge(status);
  return <span className={badge.className}>{badge.label}</span>;
}

export default async function InterestedVolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ assigned?: string }>;
}) {
  const params = await searchParams;
  const [volunteers, write] = await Promise.all([listInterestedVolunteers(), canWrite()]);
  const eventDates = getEventDates();
  const active = volunteers.filter((v) => v.status === "interested");
  const placed = volunteers.filter((v) => v.status === "placed");
  const withdrawn = volunteers.filter((v) => v.status === "withdrawn");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Interested Volunteers</h2>
        <p className="text-sm text-slate-600">
          Planning pool for scheduled shifts. Signup:{" "}
          <Link href="/join-shift" className="font-medium text-blue-700 underline">
            /join-shift
          </Link>
          . Backup pool:{" "}
          <Link href="/on-call" className="font-medium text-blue-700 underline">
            On-Call
          </Link>
          . Unified contacts:{" "}
          <Link href="/volunteers" className="font-medium text-blue-700 underline">
            Volunteer Profiles
          </Link>
          .
        </p>
      </div>

      {params.assigned === "1" ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-900">
          Assigned to shift. Volunteer moved to Assigned on Schedule.
        </p>
      ) : null}

      <Card title={`Interested Volunteers at a Glance (${active.length})`}>
        <p className="mb-2 text-xs text-slate-500">
          Newest first.
          {write ? (
            <>
              {" "}
              Use <strong>Assign</strong> or <strong>Edit</strong> below.
            </>
          ) : (
            <>
              {" "}
              Use <strong>Edit</strong> to jump to details below.
            </>
          )}
        </p>
        {active.length === 0 ? (
          <p className="text-sm text-slate-500">No active interested volunteers.</p>
        ) : (
          <InterestedVolunteerRosterTable
            volunteers={active}
            showEditLink
            showAssignLink={write}
            showContact={write}
          />
        )}
        {placed.length > 0 && (
          <details className="group mt-3 rounded-lg border border-slate-200 bg-slate-50/60">
            <summary className="cursor-pointer list-none px-3 py-1.5 text-xs font-medium text-slate-800 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block text-[10px] text-slate-500 transition group-open:rotate-90"
                >
                  ▶
                </span>
                Assigned on Schedule ({placed.length})
              </span>
            </summary>
            <div className="border-t border-slate-200 bg-white px-3 py-2">
              <InterestedVolunteerRosterTable
                volunteers={placed}
                showAssignment
                showContact={write}
              />
            </div>
          </details>
        )}
      </Card>

      <Card title={`Manage — Interested (${active.length})`}>
        {active.length === 0 ? (
          <p className="text-sm text-slate-500">No active interested volunteers.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {active.map((v) => (
              <VolunteerCard key={v.id} volunteer={v} canWrite={write} eventDates={eventDates} />
            ))}
          </div>
        )}
      </Card>

      {withdrawn.length > 0 && (
        <Card title={`Withdrawn (${withdrawn.length})`}>
          <InterestedVolunteerRosterTable volunteers={withdrawn} showContact={write} />
        </Card>
      )}
    </div>
  );
}

function VolunteerCard({
  volunteer: v,
  canWrite = true,
  eventDates,
}: {
  volunteer: Awaited<ReturnType<typeof listInterestedVolunteers>>[number];
  canWrite?: boolean;
  eventDates: string[];
}) {
  const missingContact = !hasReachableContact(v);

  return (
    <article
      id={`interested-${v.id}`}
      className={`scroll-mt-6 py-3 first:pt-0 last:pb-0 ${
        missingContact ? `-mx-1 rounded-md border border-red-200 bg-red-50/40 px-2` : ""
      }`}
    >
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <p className="text-sm font-medium text-slate-900">
          {formatVolunteerDisplayName(v.name)}{" "}
          <StatusBadge status={v.status} />
        </p>
        <p className="text-[11px] text-slate-500">
          Submitted {formatPortalDateSubmitted(v.created_at)}
          {v.last_contacted
            ? ` · Contacted ${formatPortalTimestampCompact(v.last_contacted)}`
            : ""}
        </p>
      </div>
      <p className="mb-2 text-xs text-slate-600">{summarizeInterestedAvailability(v)}</p>

      {canWrite ? (
        <form action={updateInterestedVolunteerAction.bind(null, v.id)} className="space-y-2">
          <div className="flex flex-wrap items-end gap-x-2 gap-y-1.5">
            <label className="min-w-[8rem] flex-1">
              <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                Name
              </span>
              <input name="name" defaultValue={v.name} className={fieldClass} />
            </label>
            <label className={`min-w-[7rem] ${!v.phone.trim() ? UNASSIGNED_SLOT_CLASS : ""}`}>
              <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                Phone
              </span>
              <input name="phone" defaultValue={v.phone} className={fieldClass} />
            </label>
            <label className={`min-w-[10rem] flex-1 ${!v.email.trim() ? UNASSIGNED_SLOT_CLASS : ""}`}>
              <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                Email
              </span>
              <input name="email" defaultValue={v.email} className={fieldClass} />
            </label>
            <label className="min-w-[7rem]">
              <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                Status
              </span>
              <select name="status" defaultValue={v.status} className={fieldClass}>
                <option value="interested">Interested</option>
                <option value="placed">Placed</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </label>
          </div>
          <InterestedVolunteerAvailabilityFields
            availableDates={v.available_dates}
            availableShifts={v.available_shifts}
            notes={v.notes}
            source={v.source}
            bilingual={v.bilingual === 1}
            eventDates={eventDates}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="submit"
              className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700"
            >
              Save
            </button>
            <button
              type="submit"
              formAction={deleteInterestedVolunteerAction.bind(null, v.id)}
              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
            >
              Remove
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-0.5 text-xs text-slate-600">
          <ContactPhone
            phone={v.phone}
            emptyLabel="No phone on file"
            allowContact={false}
            showContact={canWrite}
          />
          <ContactEmail
            email={v.email}
            emptyLabel="No email on file"
            allowContact={false}
            showContact={canWrite}
          />
        </div>
      )}
    </article>
  );
}
