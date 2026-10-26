import { InterestedVolunteerAvailabilityFields } from "@/components/InterestedVolunteerAvailabilityFields";
import { PortalBanner, PortalQueryBanner } from "@/components/PortalBanner";
import { Btn, Card, Input, Label } from "@/components/ui";
import { PORTAL_JOIN_SHIFT_ERRORS } from "@/lib/portal-query-feedback";
import { submitShiftSignupAction, unlockShiftSignupAction } from "@/lib/actions";
import { getVolunteerSignupPassword, hasShiftSignupAccess } from "@/lib/auth";
import { getEventDates } from "@/lib/event-dates";
import {
  PARKING_ADMISSION,
  SHIFT_VOLUNTEER_ROLE,
  SIGNUP_SAVED_SHIFT,
} from "@/lib/volunteer-signup-copy";
import Link from "next/link";

export default async function JoinShiftPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const unlocked = (await hasShiftSignupAccess()) || params.saved === "1";
  const signupPassword = getVolunteerSignupPassword();
  const saved = params.saved === "1";
  const eventDates = getEventDates();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Card>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-blue-700">
            Booth Ops
          </p>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">{SHIFT_VOLUNTEER_ROLE.title}</h1>
          <p className="mb-4 text-sm text-slate-600">{SHIFT_VOLUNTEER_ROLE.summary}</p>
          <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-slate-700">
            {SHIFT_VOLUNTEER_ROLE.bullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          {saved && (
            <PortalBanner tone="success" className="mb-4">
              <strong>{SIGNUP_SAVED_SHIFT}</strong>
            </PortalBanner>
          )}
          <PortalQueryBanner
            code={params.error}
            messages={PORTAL_JOIN_SHIFT_ERRORS}
            className="mb-4"
          />

          {!unlocked ? (
            <form action={unlockShiftSignupAction} className="space-y-3">
              <div>
                <Label>Signup password *</Label>
                <Input
                  name="signup_password"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  autoFocus
                  defaultValue={signupPassword}
                  placeholder="Signup password"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Password:{" "}
                  <span className="font-mono font-medium text-slate-800">{signupPassword}</span>
                </p>
              </div>
              <Btn type="submit" className="w-fit">
                Continue
              </Btn>
            </form>
          ) : !saved ? (
            <form action={submitShiftSignupAction} className="grid gap-3 sm:grid-cols-2">
              <p className="sm:col-span-2 text-xs font-medium text-slate-600">Your application</p>
              <div>
                <Label>Name *</Label>
                <Input name="name" required autoComplete="name" autoFocus />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input name="phone" type="tel" required autoComplete="tel" />
              </div>
              <div className="sm:col-span-2">
                <Label>Email</Label>
                <Input name="email" type="email" autoComplete="email" />
              </div>
              <div className="sm:col-span-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <p className="mb-2 text-xs font-medium text-slate-600">Availability</p>
                <InterestedVolunteerAvailabilityFields hideSource eventDates={eventDates} />
              </div>
              <Btn type="submit" className="sm:col-span-2 w-fit">
                Submit application
              </Btn>
            </form>
          ) : null}
        </Card>

        <Card title={PARKING_ADMISSION.title}>
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
            {PARKING_ADMISSION.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Card>

        <p className="text-center text-xs text-slate-500">
          <Link href="/join" className="text-blue-700 underline">
            All volunteer options
          </Link>
          {" · "}
          <Link href="/orientation/shift-volunteer" className="text-blue-700 underline">
            Shift orientation
          </Link>
          {" · "}
          <Link href="/login" className="text-blue-700 underline">
            Day Captain sign-in
          </Link>
        </p>
      </div>
    </main>
  );
}
