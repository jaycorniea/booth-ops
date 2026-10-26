import { ContactEmail, ContactPhone } from "@/components/ContactField";
import { OnCallAvailabilityFields } from "@/components/OnCallAvailabilityFields";
import { OnCallCoverageMatrix } from "@/components/OnCallCoverageMatrix";
import { OnCallContactRecord } from "@/components/OnCallContactRecord";
import { OnCallPoolNameBadge } from "@/components/OnCallPoolNameBadge";
import { OnCallVolunteerRosterTable } from "@/components/OnCallVolunteerRosterTable";
import { PortalQueryBanner } from "@/components/PortalBanner";
import { Card } from "@/components/ui";
import { PORTAL_ON_CALL_ERRORS } from "@/lib/portal-query-feedback";
import { hasReachableContact } from "@/lib/data-hygiene";
import {
  addOnCallAction,
  approveOnCallAction,
  deleteOnCallAction,
  rejectOnCallAction,
  updateOnCallAction,
} from "@/lib/actions";
import { canWrite, isAdmin } from "@/lib/auth";
import { listOnCall } from "@/lib/db";
import { summarizeOnCallAvailability } from "@/lib/on-call-display";
import {
  ON_CALL_STATUS_DESCRIPTIONS,
  ON_CALL_STATUS_LABELS,
  onCallStatusBadgeClass,
  type OnCallVolunteerStatus,
} from "@/lib/on-call-status";
import { getEventDates, UNASSIGNED_SLOT_CLASS } from "@/lib/event-dates";
import { formatVolunteerDisplayName } from "@/lib/volunteer-display-name";
import Link from "next/link";

const fieldClass =
  "w-full rounded border border-slate-300 px-1.5 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const ON_CALL_STATUS_ORDER: OnCallVolunteerStatus[] = [
  "new",
  "approved",
  "shift_requested",
  "shift_assigned",
  "withdrawn",
];

function StatusBadge({ status }: { status: OnCallVolunteerStatus }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${onCallStatusBadgeClass(status)}`}
    >
      {ON_CALL_STATUS_LABELS[status]}
    </span>
  );
}

function OnCallStatusLegend() {
  return (
    <details className="group rounded-lg border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block text-[10px] text-slate-500 transition group-open:rotate-90"
          >
            ▶
          </span>
          Status Legend
        </span>
      </summary>
      <div className="space-y-2 border-t border-slate-100 px-3 py-2">
        <p className="text-xs text-slate-600">
          Backup pool — not scheduled shift holders.
        </p>
        <ul className="space-y-1.5 text-xs">
          {ON_CALL_STATUS_ORDER.map((status) => (
            <li key={status} className="flex flex-wrap items-start gap-2">
              <StatusBadge status={status} />
              <span className="min-w-0 flex-1 text-slate-700">
                {ON_CALL_STATUS_DESCRIPTIONS[status]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export default async function OnCallPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const [volunteers, write, admin] = await Promise.all([listOnCall(), canWrite(), isAdmin()]);
  const eventDates = getEventDates();

  const pending = volunteers.filter((v) => v.status === "new");
  const active = volunteers.filter((v) => v.status === "approved" || v.status === "shift_requested");
  const assigned = volunteers.filter((v) => v.status === "shift_assigned");
  const withdrawn = volunteers.filter((v) => v.status === "withdrawn");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">On-Call Volunteer Pool</h2>
        <p className="text-sm text-slate-600">
          Same-day backup at T+15 for no-shows. Signup:{" "}
          <Link href="/join-on-call" className="font-medium text-blue-700 underline">
            /join-on-call
          </Link>
          . Planning pool:{" "}
          <Link href="/interested" className="font-medium text-blue-700 underline">
            Interested
          </Link>
          . Unified contacts:{" "}
          <Link href="/volunteers" className="font-medium text-blue-700 underline">
            Volunteer Profiles
          </Link>
          .
        </p>
      </div>

      <OnCallStatusLegend />

      <OnCallCoverageMatrix volunteers={volunteers} />

      {params.error ? (
        <PortalQueryBanner code="default" messages={PORTAL_ON_CALL_ERRORS} />
      ) : null}

      {admin && pending.length > 0 && (
        <Card title={`Pending Applications (${pending.length})`}>
          <div className="divide-y divide-amber-100">
            {pending.map((v) => (
              <div key={v.id} className="flex flex-wrap items-start justify-between gap-2 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {formatVolunteerDisplayName(v.name)}{" "}
                    <StatusBadge status={v.status} />
                  </p>
                  <p className="text-xs text-slate-600">{summarizeOnCallAvailability(v)}</p>
                  <div className="mt-0.5 space-y-0.5 text-xs text-slate-700">
                    <ContactPhone
                      phone={v.phone}
                      emptyLabel="No phone on file"
                      allowContact={false}
                      showContact={write}
                    />
                    <ContactEmail
                      email={v.email}
                      emptyLabel="No email on file"
                      allowContact={false}
                      showContact={write}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <form action={approveOnCallAction.bind(null, v.id)}>
                    <button
                      type="submit"
                      className="rounded-md bg-blue-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-800"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={rejectOnCallAction.bind(null, v.id)}>
                    <button
                      type="submit"
                      className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title={`Roster at a Glance (${active.length})`}>
        <p className="mb-2 text-xs text-slate-500">
          Newest first. Use <strong>Edit</strong> to jump to details below.
        </p>
        {active.length === 0 ? (
          <p className="text-sm text-slate-500">No active on-call volunteers in the pool.</p>
        ) : (
          <OnCallVolunteerRosterTable
            volunteers={active}
            showEditLink
            showPoolStatus
            showContact={write}
          />
        )}
        {assigned.length > 0 && (
          <details className="group mt-3 rounded-lg border border-slate-200 bg-slate-50/60">
            <summary className="cursor-pointer list-none px-3 py-1.5 text-xs font-medium text-slate-800 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block text-[10px] text-slate-500 transition group-open:rotate-90"
                >
                  ▶
                </span>
                Assigned to Shifts ({assigned.length})
              </span>
            </summary>
            <div className="border-t border-slate-200 bg-white px-3 py-2">
              <OnCallVolunteerRosterTable
                volunteers={assigned}
                showAssignment
                showContact={write}
              />
            </div>
          </details>
        )}
      </Card>

      {write && (
        <section className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <h3 className="mb-1.5 text-sm font-semibold text-slate-900">Add to Pool</h3>
          <form action={addOnCallAction} className="space-y-2">
            <div className="flex flex-wrap items-end gap-x-2 gap-y-1.5">
              <label className="min-w-[9rem] flex-1">
                <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Name *
                </span>
                <input name="name" required className={fieldClass} />
              </label>
              <label className="min-w-[7rem]">
                <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Phone
                </span>
                <input name="phone" type="tel" className={fieldClass} />
              </label>
              <label className="min-w-[10rem] flex-1">
                <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Email
                </span>
                <input name="email" type="email" className={fieldClass} />
              </label>
              <button
                type="submit"
                className="rounded-md bg-blue-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-800"
              >
                Add to Pool
              </button>
            </div>
            <OnCallAvailabilityFields eventDates={eventDates} />
          </form>
        </section>
      )}

      <Card title={`Manage — On-Call (${active.length})`}>
        {active.length === 0 ? (
          <p className="text-sm text-slate-500">
            No approved on-call volunteers yet. Share{" "}
            <Link href="/join-on-call" className="text-blue-700 underline">
              /join-on-call
            </Link>{" "}
            or add someone above.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {active.map((v) => (
              <VolunteerCard
                key={v.id}
                volunteer={v}
                canWrite={write}
                isAdmin={admin}
                eventDates={eventDates}
              />
            ))}
          </div>
        )}
      </Card>

      {admin && withdrawn.length > 0 && (
        <Card title={`Withdrawn (${withdrawn.length})`}>
          <OnCallVolunteerRosterTable volunteers={withdrawn} showContact={write} />
        </Card>
      )}
    </div>
  );
}

function VolunteerCard({
  volunteer: v,
  canWrite = true,
  isAdmin = false,
  eventDates,
}: {
  volunteer: Awaited<ReturnType<typeof listOnCall>>[number];
  canWrite?: boolean;
  isAdmin?: boolean;
  eventDates: string[];
}) {
  const missingContact = !hasReachableContact(v);

  return (
    <article
      id={`on-call-${v.id}`}
      className={`scroll-mt-6 py-3 first:pt-0 last:pb-0 ${
        missingContact ? "-mx-1 rounded-md border border-red-200 bg-red-50/40 px-2" : ""
      }`}
    >
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-medium text-slate-900">
            {formatVolunteerDisplayName(v.name)}
          </p>
          <OnCallPoolNameBadge volunteer={v} />
        </div>
      </div>
      <p className="mb-1 text-xs text-slate-600">{summarizeOnCallAvailability(v)}</p>
      <OnCallContactRecord
        volunteer={v}
        className="mb-2 space-y-1"
        itemClassName="rounded border border-violet-200 bg-violet-50/80 px-2 py-1 text-[11px] font-medium text-violet-900"
      />

      {canWrite ? (
        <form action={updateOnCallAction.bind(null, v.id)} className="space-y-2">
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
            {isAdmin && (
              <label className="min-w-[8rem]">
                <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Status
                </span>
                <select name="status" defaultValue={v.status} className={fieldClass}>
                  {(Object.keys(ON_CALL_STATUS_LABELS) as OnCallVolunteerStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {ON_CALL_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <OnCallAvailabilityFields
            noticeMinutes={v.notice_minutes ?? 45}
            availableDates={v.available_dates || "any"}
            availableShifts={v.available_shifts || "any"}
            availabilityNote={v.availability}
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
              formAction={deleteOnCallAction.bind(null, v.id)}
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
