import Link from "next/link";
import { Card } from "@/components/ui";
import { getBoothConfig } from "@/lib/booth-config";
import { getActiveEventSettings } from "@/lib/event-settings";

export default async function VolunteerHomePage() {
  const config = getBoothConfig();
  const settings = getActiveEventSettings();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Volunteer home</h1>
      <Card title={settings.boothName}>
        <p className="text-sm text-slate-700">
          {config.event.name} at {settings.boothLocation}. Hours: {settings.boothHours}.
        </p>
        <p className="mt-3 text-sm">
          <Link href="/schedule" className="font-medium text-blue-700 underline">
            View the schedule
          </Link>
        </p>
      </Card>
    </div>
  );
}
