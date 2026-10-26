import { Card } from "@/components/ui";
import { getAuthRole } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CaptainAddVolunteerHowToPage() {
  const role = await getAuthRole();
  if (role !== "captain" && role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase text-blue-700">Day Captain · How-to</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Add a volunteer to your day</h2>
        <p className="mt-2 text-sm text-slate-600">
          Use the Shift Sheet like a spreadsheet. Type the volunteer into an open slot — changes save
          when you leave the row.
        </p>
      </div>

      <Card title="1. Sign in">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>
            Open the portal:{" "}
            <a
              href="https://booth-ops.vercel.app"
              className="font-medium text-blue-700 underline"
            >
              booth-ops.vercel.app
            </a>
          </li>
          <li>Enter the Day Captain portal password (from PI).</li>
          <li>Tap Sign in — you should land on Event days 2026.</li>
        </ol>
      </Card>

      <Card title="2. Pick your day">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>On the home page, open the card for your event day.</li>
          <li>
            <strong>August 27 only:</strong> choose Morning or Afternoon (your half-day).
          </li>
          <li>That opens the Volunteer Shift Sheet for that day.</li>
        </ol>
        <p className="mt-3 text-sm text-slate-600">
          Next time in the same session, use{" "}
          <Link href="/" className="font-medium text-blue-700 underline">
            Home
          </Link>{" "}
          or <strong>Home</strong> in the top nav to pick another day.
        </p>
      </Card>

      <Card title="3. Find an open slot">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>Each row is one time block (for example 9–11, 11–1).</li>
          <li>Each row has two volunteer spots (left and right).</li>
          <li>An empty Name cell means that spot is open.</li>
        </ul>
      </Card>

      <Card title="4. Enter the volunteer">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-1.5 pr-3 font-semibold">Field</th>
                <th className="py-1.5 font-semibold">What to enter</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 pr-3 font-medium">Name</td>
                <td className="py-1.5">Full name</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 pr-3 font-medium">Phone</td>
                <td className="py-1.5">Best number (helps if you need to call)</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3 font-medium">Email</td>
                <td className="py-1.5">If they have one</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          On a phone, fields may stack under each shift — same idea for Volunteer 1 and Volunteer 2.
        </p>
      </Card>

      <Card title="5. Save (automatic)">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Click or tap outside the row (or move to another row).</li>
          <li>
            The shift label shows <strong>Saving…</strong>, then <strong>✓ Saved</strong>.
          </li>
          <li>There is no separate Save button — leaving the row saves it.</li>
        </ol>
        <p className="mt-3 text-sm text-slate-600">
          Hint under the sheet: “Changes save when you leave a row.” If you see Save failed, try again
          or check your connection.
        </p>
      </Card>

      <Card title="6. Double-check">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Confirm the name (and phone) still show after ✓ Saved.</li>
          <li>The fill bar at the top of the day updates when slots are filled.</li>
          <li>Logout when finished, or use Home for another day.</li>
        </ol>
      </Card>

      <Card title="Tips">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>
            <strong>Two people on the same shift:</strong> fill both left and right columns on that
            row.
          </li>
          <li>
            <strong>Replace someone:</strong> overwrite their fields, then leave the row so it saves.
          </li>
          <li>
            <strong>Clear a slot:</strong> delete the name (and phone/email if needed), then leave the
            row.
          </li>
          <li>
            <strong>No-show or last-minute gap:</strong> do not assign from interested/on-call
            yourself — call the coordinator for backup.
          </li>
        </ul>
      </Card>

      <Card title="Quick checklist">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Login with Day Captain password</li>
          <li>Open your day on Event days</li>
          <li>Find the right shift row and an empty slot</li>
          <li>Type name (and phone / email)</li>
          <li>Leave the row → wait for ✓ Saved</li>
        </ol>
      </Card>

      <p className="text-sm text-slate-600">
        <Link href="/more" className="font-medium text-blue-700 underline">
          ← Captain&apos;s Extras
        </Link>
        {" · "}
        <Link href="/orientation/day-captain" className="font-medium text-blue-700 underline">
          Day Captain Orientation
        </Link>
      </p>
    </div>
  );
}
