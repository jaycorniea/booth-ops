import { DayCaptainSpreadsheetTable } from "@/components/DayCaptainSpreadsheetTable";
import { Card } from "@/components/ui";
import { formatRegionLabel } from "@/lib/region-label";
import { type CaptainSlot, getCaptainSlotsForDate } from "@/lib/day-captain-slots";
import type { DayCaptainRow } from "@/lib/db";
import { SPREADSHEET_AUTOSAVE_HINT } from "@/lib/spreadsheet-autosave-copy";
import { formatVolunteerDisplayName } from "@/lib/volunteer-display-name";

interface DayCaptainSectionsProps {
  eventDate: string;
  captains: DayCaptainRow[];
  write: boolean;
  contact: boolean;
  variant?: "banner" | "forms" | "both";
  /** Split event day — show only this captain half-day. */
  captainSlot?: CaptainSlot;
  /** Captain shell — collapse the edit card below the shift sheet. */
  captainView?: boolean;
  /** Forms only, no Card wrapper (admin compact day page). */
  bare?: boolean;
}

export function DayCaptainSections({
  eventDate,
  captains,
  write,
  contact,
  variant = "both",
  captainSlot,
  captainView = false,
  bare = false,
}: DayCaptainSectionsProps) {
  const slots = getCaptainSlotsForDate(eventDate).filter(
    (cfg) => !captainSlot || cfg.slot === captainSlot
  );

  return (
    <>
      {(variant === "banner" || variant === "both") && (
        <section className="space-y-2">
          {slots.map((cfg) => {
            const captain = captains.find((c) => c.captain_slot === cfg.slot);
            const district = formatRegionLabel(captain?.district);
            return (
              <div
                key={cfg.slot}
                className="flex items-center justify-between gap-3 rounded-lg bg-blue-700 px-3 py-2 text-white shadow-sm"
              >
                <div className="min-w-0">
                  {captain?.name?.trim() ? (
                    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm leading-snug">
                      <span className="font-semibold">
                        {formatVolunteerDisplayName(captain.name)}
                      </span>
                      {district ? (
                        <>
                          <span className="text-blue-300" aria-hidden>
                            ·
                          </span>
                          <span className="text-xs text-blue-200">{district}</span>
                        </>
                      ) : null}
                    </p>
                  ) : (
                    <p className="text-xs leading-snug text-blue-100">
                      No {cfg.label.toLowerCase()} assigned — update below or ask the coordinator.
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-right text-[10px] font-semibold uppercase leading-snug tracking-wide text-blue-200">
                  {cfg.label} · {cfg.timeRange}
                </p>
              </div>
            );
          })}
        </section>
      )}

      {(variant === "forms" || variant === "both") &&
        (captainView ? (
          <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">
              Your Day Captain Info
            </summary>
            <div className="border-t border-slate-100 px-4 pb-4 pt-3">
              {write ? (
                <p className="mb-2 text-xs text-slate-500">{SPREADSHEET_AUTOSAVE_HINT}</p>
              ) : null}
              <DayCaptainSpreadsheetTable
                slots={slots}
                captains={captains}
                eventDate={eventDate}
                write={write}
                contact={contact}
              />
            </div>
          </details>
        ) : bare ? (
          <DayCaptainSpreadsheetTable
            slots={slots}
            captains={captains}
            eventDate={eventDate}
            write={write}
            contact={contact}
          />
        ) : (
          <Card title={slots.length === 1 ? slots[0].label : "Day Captains"}>
            {write ? (
              <p className="mb-2 text-xs text-slate-500">{SPREADSHEET_AUTOSAVE_HINT}</p>
            ) : null}
            <DayCaptainSpreadsheetTable
              slots={slots}
              captains={captains}
              eventDate={eventDate}
              write={write}
              contact={contact}
            />
          </Card>
        ))}
    </>
  );
}