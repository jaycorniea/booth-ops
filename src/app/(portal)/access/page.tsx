import { Card } from "@/components/ui";
import {
  getAdminPassword,
  getDayCaptainPassword,
  getVolunteerPortalPassword,
  isAdmin,
  requireCaptainAccess,
} from "@/lib/auth";
import Link from "next/link";
import { portalBaseUrl } from "@/lib/portal-url";

const BASE_URL = portalBaseUrl();

function PasswordRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-sm text-slate-900">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-600">{note}</p>}
    </div>
  );
}

export default async function AccessPage() {
  await requireCaptainAccess();
  const admin = await isAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Portal access & passwords</h2>
        <p className="text-sm text-slate-600">
          Day Captain reference for portal sign-in.
        </p>
      </div>

      <Card title="Portal sign-in">
        <div className="grid gap-3 sm:grid-cols-2">
          <PasswordRow label="Portal URL" value={BASE_URL} />
          <PasswordRow
            label="Day Captain password"
            value={getDayCaptainPassword()}
            note="Shared by all day captains — use for portal sign-in."
          />
          <PasswordRow
            label="Volunteer password"
            value={getVolunteerPortalPassword()}
            note="Read-only roster (names only), schedule and the day log. This is the password most volunteers were given."
          />
          {admin ? (
            <PasswordRow
              label="Admin password"
              value={getAdminPassword()}
              note="Event organizers. Full portal."
            />
          ) : null}
        </div>
      </Card>

      <Card title="Public orientation (no password)">
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/orientation/shift-volunteer" className="text-blue-700 underline">
            Shift orientation
          </Link>
          <Link href="/orientation/volunteer-guidance" className="text-blue-700 underline">
            Booth guidance
          </Link>
          <Link href="/orientation/day-captain" className="text-blue-700 underline">
            Day Captain orientation
          </Link>
          <Link href="/map" className="text-blue-700 underline">
            Venue map
          </Link>
        </div>
      </Card>
    </div>
  );
}
