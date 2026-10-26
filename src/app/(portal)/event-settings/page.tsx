import { Btn, Card, Input, Label } from "@/components/ui";
import { saveEventSettingsAction } from "@/lib/actions";
import { isAdmin } from "@/lib/auth";
import { getEventSettings } from "@/lib/db";
import { deriveEventSettings, formatEventDateLong } from "@/lib/event-settings";
import { formatEventDate } from "@/lib/event-dates";
import { redirect } from "next/navigation";

export default async function FairYearPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  if (!(await isAdmin())) {
    redirect("/?error=admin_required");
  }

  const params = await searchParams;
  const settings = await getEventSettings();
  const derived = deriveEventSettings(settings);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Event settings</h2>
        <p className="text-sm text-slate-600">
          Booth chair setup for the next season. Saving creates empty shift and captain rows for new
          dates. Existing days stay in the database.
        </p>
      </div>

      {params.saved ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          Event settings saved. Home, schedule, and day pages now use these dates.
        </p>
      ) : null}
      {params.error === "invalid" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Check the dates — end must be after start, setup must finish before opening day, and year
          must match the start date.
        </p>
      ) : null}

      <form action={saveEventSettingsAction} className="space-y-4">
        <Card title="Calendar">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Year" name="year" type="number" defaultValue={String(settings.year)} />
            <Field label="Event start" name="openDate" type="date" defaultValue={settings.openDate} />
            <Field label="Event end" name="closeDate" type="date" defaultValue={settings.closeDate} />
            <Field
              label="Setup start"
              name="setupStartDate"
              type="date"
              defaultValue={settings.setupStartDate}
            />
            <Field
              label="Setup end"
              name="setupEndDate"
              type="date"
              defaultValue={settings.setupEndDate}
            />
            <Field
              label="Captain tools open"
              name="captainToolsOpenDate"
              type="date"
              defaultValue={settings.captainToolsOpenDate}
            />
            <Field
              label="Split captain day"
              name="splitCaptainDate"
              type="date"
              defaultValue={settings.splitCaptainDate}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Split captain day is two half-day captains (9–3 / 3–9). Leave blank for a single
            all-day captain on every date. Setup days stay out of the portal.
          </p>
        </Card>

        <Card title="Booth">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Booth name" name="boothName" defaultValue={settings.boothName} />
            <Field label="Location" name="boothLocation" defaultValue={settings.boothLocation} />
            <Field
              label="Hours"
              name="boothHours"
              defaultValue={settings.boothHours}
              className="sm:col-span-2"
            />
          </div>
        </Card>

        <Card title="PI contact">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Name" name="contactName" defaultValue={settings.contactName} />
            <Field label="Phone" name="contactPhone" defaultValue={settings.contactPhone} />
            <Field
              label="Email"
              name="contactEmail"
              type="email"
              defaultValue={settings.contactEmail}
            />
          </div>
        </Card>

        <div className="flex items-center gap-2">
          <Btn type="submit">Save event settings</Btn>
        </div>
      </form>

      <Card title="Derived from these dates">
        <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          <Derived label="Event days" value={`${derived.dayCount} (${formatEventDate(settings.openDate)} – ${formatEventDate(settings.closeDate)})`} />
          <Derived label="Event eve" value={formatEventDateLong(derived.eveDate)} />
          <Derived label="Window C starts" value={`9:00 pm Central on ${formatEventDateLong(derived.eveDate)}`} />
          <Derived
            label="Window D starts"
            value={`9:00 pm Central on ${formatEventDateLong(settings.closeDate)}`}
          />
        </dl>
      </Card>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <Input name={name} type={type} defaultValue={defaultValue} required={name !== "splitCaptainDate"} />
    </div>
  );
}

function Derived({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-1 last:border-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-right text-xs font-medium text-slate-800">{value}</dd>
    </div>
  );
}
