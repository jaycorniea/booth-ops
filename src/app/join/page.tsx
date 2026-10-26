import { VolunteerSignupLinks } from "@/components/VolunteerSignupLinks";
import { Card } from "@/components/ui";
import { getEventSettings } from "@/lib/db";
import { boothWhenWhereLines } from "@/lib/event-settings";
import {
  ON_CALL_ROLE,
  PARKING_ADMISSION,
  SHIFT_VOLUNTEER_ROLE,
} from "@/lib/volunteer-signup-copy";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function JoinPage() {
  const settings = await getEventSettings();
  const whenWhere = boothWhenWhereLines(settings);
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Volunteer at the booth</h1>
        <p className="mt-1 text-sm text-slate-600">Pick a role and apply.</p>
      </div>
      <Card title="When & where">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {whenWhere.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Card>
      <Card title={SHIFT_VOLUNTEER_ROLE.title}>
        <p className="text-sm text-slate-700">{SHIFT_VOLUNTEER_ROLE.summary}</p>
        <Link href={SHIFT_VOLUNTEER_ROLE.signupPath} className="mt-3 inline-block font-medium text-blue-700 underline">
          {SHIFT_VOLUNTEER_ROLE.signupCta}
        </Link>
      </Card>
      <Card title={ON_CALL_ROLE.title}>
        <p className="text-sm text-slate-700">{ON_CALL_ROLE.summary}</p>
        <Link href={ON_CALL_ROLE.signupPath} className="mt-3 inline-block font-medium text-blue-700 underline">
          {ON_CALL_ROLE.signupCta}
        </Link>
      </Card>
      <Card title={PARKING_ADMISSION.title}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {PARKING_ADMISSION.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Card>
      <VolunteerSignupLinks />
    </main>
  );
}
