import { captainDayContactStripMode } from "@/lib/captain-day-view";
import { getActiveEventSettings } from "@/lib/event-settings";

const STRIP_CLASS = "rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-slate-800";

export function CoordinatorContactStrip({
  asOf = new Date(),
  alwaysShow = false,
}: {
  asOf?: Date;
  alwaysShow?: boolean;
}) {
  const mode = captainDayContactStripMode(asOf);
  if (mode === "hidden" && !alwaysShow) return null;
  const settings = getActiveEventSettings();
  const phoneHref = `tel:${settings.contactPhone.replace(/\D/g, "")}`;
  const mailHref = `mailto:${settings.contactEmail}`;

  if (mode === "signup" || (mode === "hidden" && alwaysShow)) {
    return (
      <div className={STRIP_CLASS}>
        If you have questions, email{" "}
        <a href={mailHref} className="font-medium text-blue-800 underline">
          {settings.contactEmail}
        </a>
        . For urgent issues call {settings.contactName} at{" "}
        <a href={phoneHref} className="font-medium text-blue-800 underline">
          {settings.contactPhone}
        </a>
        .
      </div>
    );
  }

  return (
    <div className={STRIP_CLASS}>
      <strong>Shift gap or no-show?</strong> Call {settings.contactName} —{" "}
      <a href={phoneHref} className="font-medium text-blue-800 underline">
        {settings.contactPhone}
      </a>
      {" · "}
      <a href={mailHref} className="font-medium text-blue-800 underline">
        {settings.contactEmail}
      </a>
    </div>
  );
}
