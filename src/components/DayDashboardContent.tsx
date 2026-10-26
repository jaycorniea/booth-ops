import { ChecklistToggle } from "@/components/ChecklistToggle";
import { DayCaptainSections } from "@/components/DayCaptainSections";
import { PrintButton } from "@/components/PrintButton";
import { ShiftSlotsFillBar } from "@/components/ShiftSlotsFillBar";
import { DayShiftVolunteerTable } from "@/components/DayShiftVolunteerTable";
import { Card } from "@/components/ui";
import { formatRegionLabel } from "@/lib/region-label";
import { CLOSING_CHECKLIST, OPENING_CHECKLIST, SCENARIOS } from "@/lib/checklists";
import type { CaptainSlot, CaptainSlotConfig } from "@/lib/day-captain-slots";
import { getCaptainSlotsForDate } from "@/lib/day-captain-slots";
import { formatScheduleDayTitle, hasVolunteer, UNASSIGNED_SLOT_TEXT_CLASS } from "@/lib/event-dates";
import type { DayCaptainRow, Shift } from "@/lib/db";

import { getActiveEventSettings } from "@/lib/event-settings";
import { countShiftSlots } from "@/lib/kpi-snapshots";
import { SPREADSHEET_AUTOSAVE_HINT } from "@/lib/spreadsheet-autosave-copy";

import { formatVolunteerDisplayName } from "@/lib/volunteer-display-name";
import Link from "next/link";

function DayCaptainHeaderNames({
  date,
  captains,
  captainSlot,
  slotConfig,
}: {
  date: string;
  captains: DayCaptainRow[];
  captainSlot?: CaptainSlot;
  slotConfig?: CaptainSlotConfig;
}) {
  const slots = getCaptainSlotsForDate(date).filter(
    (cfg) => !captainSlot || cfg.slot === captainSlot
  );
  const lines = slots.map((cfg) => {
    const captain = captains.find((c) => c.captain_slot === cfg.slot);
    const name = captain?.name?.trim();
    const district = formatRegionLabel(captain?.district);
    const displayName = name ? formatVolunteerDisplayName(name) : "Open";
    return { label: cfg.label, displayName, district, assigned: Boolean(name) };
  });

  return (
    <>
      {slotConfig ? (
        <p className="text-sm text-slate-600">
          {slotConfig.label} · {slotConfig.timeRange}
        </p>
      ) : null}
      <p className="text-sm leading-snug text-slate-800">
        {lines.map((line, i) => (
          <span key={line.label}>
            {i > 0 ? <span className="text-slate-400"> · </span> : null}
            {lines.length > 1 ? (
              <span className="text-slate-600">{line.label}: </span>
            ) : !slotConfig ? (
              <span className="text-slate-600">Day Captain · </span>
            ) : null}
            <span className={line.assigned ? "font-semibold" : UNASSIGNED_SLOT_TEXT_CLASS}>
              {line.displayName}
            </span>
            {line.district ? (
              <span className="text-slate-600"> · {line.district}</span>
            ) : null}
          </span>
        ))}
      </p>
    </>
  );
}

type DayDashboardContentProps = {
  date: string;
  write: boolean;
  contact: boolean;
  checklist: Record<string, boolean>;
  captains: DayCaptainRow[];
  shifts: Shift[];
  /** Split event day only — `am` or `pm` half-day dashboard. */
  captainSlot?: CaptainSlot;
  captainView?: boolean;
  isAdmin?: boolean;
};

export function DayDashboardContent({
  date,
  write,
  contact,
  checklist,
  captains,
  shifts,
  captainSlot,
  captainView = false,
  isAdmin = false,
}: DayDashboardContentProps) {
  const slotConfig = captainSlot
    ? getCaptainSlotsForDate(date).find((cfg) => cfg.slot === captainSlot)
    : undefined;
  const visibleShifts = slotConfig
    ? shifts.filter((s) => slotConfig.shiftNums.includes(s.shift_num))
    : shifts;
  const daySlotFill = countShiftSlots(visibleShifts);
  const fillScope = slotConfig ? `for ${slotConfig.timeRange}` : "for this day";

  const showOpeningChecklist = !captainView && (!captainSlot || captainSlot === "am");
  const showClosingChecklist = !captainView && (!captainSlot || captainSlot === "pm");

  const dayHeader = (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2 className="text-2xl font-bold">{formatScheduleDayTitle(date)}</h2>
        <DayCaptainHeaderNames
          date={date}
          captains={captains}
          captainSlot={captainSlot}
          slotConfig={slotConfig}
        />
      </div>
      <div className="flex min-w-[12rem] flex-1 items-center gap-3 sm:max-w-md">
        <ShiftSlotsFillBar
          filled={daySlotFill.filled}
          total={daySlotFill.total}
          extraCount={0}
          scope={fillScope}
        />
        <PrintButton />
      </div>
    </div>
  );

  if (captainView) {
    return (
      <div className="space-y-6">
        {dayHeader}

        <Card title={slotConfig ? "Volunteer Shifts" : "Volunteer Shift Sheet"}>
          <DayShiftVolunteerTable
            shifts={visibleShifts}
            eventDate={date}
            canWrite={write}
            allowContact={contact}
          />
        </Card>

        <DayCaptainSections
          eventDate={date}
          captains={captains}
          write={write}
          contact={contact}
          variant="forms"
          captainSlot={captainSlot}
          captainView={captainView}
        />

        {write ? (
          <p className="text-sm text-slate-600">
            <Link href={`/day-log?date=${date}`} className="font-medium text-blue-700 underline">
              Day log (clicker)
            </Link>
            {" · "}
            <Link href={`/day/${date}/eod`} className="font-medium text-blue-700 underline">
              Day Captain report
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dayHeader}

      <section className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            {slotConfig ? slotConfig.label : "Day Captain"}
          </h3>
          {write ? <p className="text-[11px] text-slate-500">{SPREADSHEET_AUTOSAVE_HINT}</p> : null}
        </div>
        <DayCaptainSections
          eventDate={date}
          captains={captains}
          write={write}
          contact={contact}
          variant="forms"
          captainSlot={captainSlot}
          captainView={false}
          bare
        />
      </section>

      <Card title="Volunteer Shifts">
        <DayShiftVolunteerTable
          shifts={visibleShifts}
          eventDate={date}
          canWrite={write}
          allowContact={contact}
        />
      </Card>

      {write ? (
        <p className="text-sm text-slate-600">
          <Link href={`/day-log?date=${date}`} className="font-medium text-blue-700 underline">
            Day log (clicker)
          </Link>
          {" · "}
          <Link href={`/day/${date}/eod`} className="font-medium text-blue-700 underline">
            Day Captain report
          </Link>
        </p>
      ) : null}

      <details className="group rounded-lg border border-slate-200 bg-white shadow-sm no-print">
        <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block text-[10px] text-slate-500 transition group-open:rotate-90"
            >
              ▶
            </span>
            Ops Reference
          </span>
        </summary>
        <div className="space-y-4 border-t border-slate-100 px-3 py-3">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Escalation & Resources
            </p>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-700">
              <li>
                <span className="font-medium text-slate-800">PI:</span> coordinator contact
              </li>
              <li>
                <Link href="/resources" className="font-medium text-blue-700 underline">
                  Resources
                </Link>
              </li>
              <li>
                <span className="font-medium text-slate-800">Security:</span> TBD
              </li>
            </ul>
          </div>

          {(showOpeningChecklist || showClosingChecklist) && (
            <div
              className={`grid gap-3 ${
                showOpeningChecklist && showClosingChecklist ? "sm:grid-cols-2" : ""
              }`}
            >
              {showOpeningChecklist && (
                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Opening Checklist
                  </p>
                  <div className="space-y-0.5">
                    {OPENING_CHECKLIST.map((item) => (
                      <ChecklistToggle
                        key={item.key}
                        eventDate={date}
                        itemKey={item.key}
                        label={item.label}
                        checked={!!checklist[item.key]}
                        canWrite={write}
                        compact
                      />
                    ))}
                  </div>
                </div>
              )}
              {showClosingChecklist && (
                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Closing Checklist
                  </p>
                  <div className="space-y-0.5">
                    {CLOSING_CHECKLIST.map((item) => (
                      <ChecklistToggle
                        key={item.key}
                        eventDate={date}
                        itemKey={item.key}
                        label={item.label}
                        checked={!!checklist[item.key]}
                        canWrite={write}
                        compact
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Scenario Quick Reference
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SCENARIOS.map((s) => (
                <div key={s.title} className="rounded border border-slate-100 bg-slate-50/80 px-2 py-1.5">
                  <p className="text-xs font-semibold text-slate-900">{s.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{s.action}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Pamphlets
                  </p>
                  <ul className="mt-0.5 space-y-0.5 text-[11px] text-slate-700">
                    {s.pamphlets.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Runbook Reminders
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-700">
              <li>
                {getActiveEventSettings().officialSlotsPerShift} volunteers per shift; check in each
                shift at start
              </li>
              <li>Clicker: 1 click = words exchanged — start and end readings at shift change</li>
              <li>No-show by T+15 min → call the coordinator</li>
              <li>Supplies → the coordinator</li>
              <li>EOD: visitor count + shift status in portal</li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}
