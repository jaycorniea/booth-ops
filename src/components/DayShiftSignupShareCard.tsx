import { Card } from "@/components/ui";
import { getVolunteerSignupPassword } from "@/lib/auth";
import { dayShiftSignupUrl } from "@/lib/day-shift-signup";
import { formatEventDate } from "@/lib/event-dates";
import Link from "next/link";

export function DayShiftSignupShareCard({ eventDate }: { eventDate: string }) {
  const volunteerPassword = getVolunteerSignupPassword();
  const url = dayShiftSignupUrl(eventDate);

  return (
    <Card title="Shift volunteer signup — share your event day">
      <p className="mb-4 text-sm text-slate-600">
        Share this link for people to signup for a shift on your event day. Give applicants the
        link for <strong>{formatEventDate(eventDate)}</strong> plus password{" "}
        <span className="font-mono font-medium">{volunteerPassword}</span>.
      </p>
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
        <strong>Your day:</strong>{" "}
        <a href={url} className="break-all font-mono text-blue-800 underline">
          {url}
        </a>
      </div>
      <Link
        href={`/join-shift/${eventDate}`}
        className="mt-3 inline-block text-sm font-medium text-blue-700 underline"
      >
        Preview signup page →
      </Link>
    </Card>
  );
}