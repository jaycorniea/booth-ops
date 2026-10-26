import { PortalQueryBanner } from "@/components/PortalBanner";
import { CaptainPickedDayScroll } from "@/components/CaptainPickedDayScroll";
import { DayFillBadge } from "@/components/DayFillBadge";
import { StoplightFillTrack } from "@/components/StoplightFill";
import { ShiftSlotsFillBar } from "@/components/ShiftSlotsFillBar";
import { EventCountdown } from "@/components/EventCountdown";
import { CAPTAIN_WINDOW_MESSAGES, PORTAL_HOME_ERRORS } from "@/lib/portal-query-feedback";

import { type CaptainSlot, hasAllDayCaptainsAssigned } from "@/lib/day-captain-slots";
import {
  formatEventDayCard,
  getEventDates,
  isCaptainFeedbackOpen,
  UNASSIGNED_CAPTAIN_DAY_CLASS,
} from "@/lib/event-dates";
import { getAuthRole } from "@/lib/auth";
import { getCaptainPickedDayKey } from "@/lib/captain-picked-day-server";
import { formatPhoneDisplay } from "@/lib/phone-format";
import { listAllShifts, listDayCaptains } from "@/lib/db";
import { getCaptainSlotsForDate, isSplitCaptainDay } from "@/lib/day-captain-slots";
import { dayDashboardHref } from "@/lib/day-routes";
import { countShiftSlots } from "@/lib/kpi-snapshots";
import { fillSlotsAriaLabel } from "@/lib/shift-fill";
import { formatVolunteerDisplayName } from "@/lib/volunteer-display-name";
import { getActiveEventSettings } from "@/lib/event-settings";
import { getPortalAsOf, getEffectivePortalWindow } from "@/lib/portal-window-sim-server";
import { captainCanUseDayTools } from "@/lib/portal-windows";
import Link from "next/link";

type HomeDayCard = {
  date: string;
  cardKey: string;
  captains: {
    event_date: string;
    captain_slot: CaptainSlot;
    name: string;
    phone: string;
    email: string;
  }[];
  slotFill: { filled: number; total: number };
  captainSlot?: "am" | "pm";
  slotLabel?: string;
  timeRange?: string;
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; captain_window?: string }>;
}) {
  const params = await searchParams;
  const role = await getAuthRole();
  const isCaptainHome = role === "captain";
  const lastPickedKey = isCaptainHome ? await getCaptainPickedDayKey() : undefined;
  const portalAsOf = await getPortalAsOf();
  const captainToolsOpen = !isCaptainHome || captainCanUseDayTools(portalAsOf);
  const captainWindowBanner =
    params.captain_window ??
    (isCaptainHome && !captainToolsOpen ? await getEffectivePortalWindow() : undefined);
  const dates = getEventDates();
  const [allShifts, allCaptains] = await Promise.all([
    listAllShifts(),
    listDayCaptains(),
  ]);
  const shiftsByDate = new Map<string, typeof allShifts>();
  for (const shift of allShifts) {
    const list = shiftsByDate.get(shift.event_date) ?? [];
    list.push(shift);
    shiftsByDate.set(shift.event_date, list);
  }
  const captainsByDate = new Map<string, typeof allCaptains>();
  for (const captain of allCaptains) {
    const list = captainsByDate.get(captain.event_date) ?? [];
    list.push(captain);
    captainsByDate.set(captain.event_date, list);
  }
  const dayCards: HomeDayCard[] = dates.flatMap((date) => {
    const shifts = shiftsByDate.get(date) ?? [];
    const captainRows = captainsByDate.get(date) ?? [];
    const slots = getCaptainSlotsForDate(date);
    const captains = slots.map((cfg) => {
      const row = captainRows.find((r) => r.captain_slot === cfg.slot);
      if (row) return row;
      return {
        event_date: date,
        captain_slot: cfg.slot,
        name: "",
        phone: "",
        email: "",
      };
    });

    if (isSplitCaptainDay(date)) {
      return slots.map((cfg) => {
        const captain = captains.find((c) => c.captain_slot === cfg.slot)!;
        const halfShifts = shifts.filter((s) => cfg.shiftNums.includes(s.shift_num));
        return {
          date,
          cardKey: `${date}:${cfg.slot}`,
          captainSlot: cfg.slot,
          slotLabel: cfg.label,
          timeRange: cfg.timeRange,
          captains: [captain],
          slotFill: countShiftSlots(halfShifts),
        };
      });
    }

    return [
      {
        date,
        cardKey: date,
        captains,
        slotFill: countShiftSlots(shifts),
      },
    ];
  });
  const feedbackOpen = isCaptainFeedbackOpen(portalAsOf);
  const eventSettings = getActiveEventSettings();
  const totalSlotFill = dayCards.reduce(
    (acc, { slotFill }) => ({
      filled: acc.filled + slotFill.filled,
      total: acc.total + slotFill.total,
    }),
    { filled: 0, total: 0 }
  );

  return (
    <div className="space-y-6">
      <PortalQueryBanner code={params.error} messages={PORTAL_HOME_ERRORS} />
      <PortalQueryBanner code={captainWindowBanner} messages={CAPTAIN_WINDOW_MESSAGES} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-slate-900">Event days 2026</h2>
          {!isCaptainHome && (
            <p className="text-sm text-slate-600">
              {eventSettings.boothLocation} · {eventSettings.boothHours} ·{" "}
              {eventSettings.shiftTemplates.length} shifts per day
            </p>
          )}
        </div>
        <EventCountdown />
      </div>

      {captainToolsOpen && (
        <>
      <ShiftSlotsFillBar filled={totalSlotFill.filled} total={totalSlotFill.total} />

      {lastPickedKey ? (
        <p className="text-xs text-slate-500">Last opened day highlighted below.</p>
      ) : null}
      <CaptainPickedDayScroll cardKey={lastPickedKey} />

      <div id="event-days" className="grid scroll-mt-4 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dayCards.map((card) => {
          const { date, cardKey, captains, slotFill, captainSlot, slotLabel, timeRange } = card;
          const isLastPicked = cardKey === lastPickedKey;
          const splitCard = Boolean(captainSlot);
          const captainAssigned = splitCard
            ? Boolean(captains[0]?.name?.trim())
            : hasAllDayCaptainsAssigned(date, captains);
          const assignedCaptains = captains.filter((c) => c.name?.trim());
          const fillScope = splitCard && slotLabel ? slotLabel.toLowerCase() : undefined;
          const fillAria = fillSlotsAriaLabel(slotFill.filled, slotFill.total, fillScope);
          const fillTrack = (
            <StoplightFillTrack
              filled={slotFill.filled}
              total={slotFill.total}
              className="mt-2"
            />
          );
          return (
            <Link
              key={cardKey}
              id={`event-day-${cardKey}`}
              href={dayDashboardHref(date, captainSlot)}
              className={`rounded-xl border p-4 shadow-sm transition hover:shadow-md ${
                isLastPicked ? "ring-2 ring-blue-500 ring-offset-1" : ""
              } ${
                captainAssigned
                  ? "border-slate-200 bg-white hover:border-blue-300"
                  : UNASSIGNED_CAPTAIN_DAY_CLASS
              }`}
              aria-label={`${formatEventDayCard(date)}${slotLabel ? `, ${slotLabel}` : ""}: ${fillAria}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`font-semibold ${captainAssigned ? "text-slate-900" : "text-red-700/80"}`}>
                    {formatEventDayCard(date)}
                  </p>
                </div>
                <DayFillBadge filled={slotFill.filled} total={slotFill.total} scope={fillScope} />
              </div>
              {splitCard ? fillTrack : null}
              {slotLabel ? (
                <p className="mt-1 text-sm font-semibold text-blue-800">{slotLabel}</p>
              ) : null}
              {timeRange ? (
                <p className="text-xs font-medium text-slate-500">{timeRange}</p>
              ) : null}
              {!captainAssigned && (
                <p className="mt-2 text-sm text-red-600/70">
                  {splitCard || !assignedCaptains.length
                    ? "No Day Captain assigned"
                    : "Day Captain slot open"}
                </p>
              )}
              {!splitCard ? fillTrack : null}
              {assignedCaptains.length > 0 && (
                <div className="mt-2 space-y-2 text-sm text-blue-700">
                  {assignedCaptains.map((captain) => {
                    const captainLabel = splitCard
                      ? null
                      : captain.captain_slot === "am"
                        ? "AM Captain"
                        : captain.captain_slot === "pm"
                          ? "PM Captain"
                          : "Day Captain";
                    return (
                    <div key={captain.captain_slot}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="min-w-0 text-slate-700">
                          {captainLabel ? (
                            <span className="font-normal text-slate-500">{captainLabel}: </span>
                          ) : null}
                          <span className="font-semibold text-slate-900">
                            {formatVolunteerDisplayName(captain.name)}
                          </span>
                        </p>
                        <span className="shrink-0 text-xs tabular-nums text-slate-600">
                          {slotFill.filled}/{slotFill.total} slots filled
                        </span>
                      </div>
                      {captain.phone && (role === "admin" || role === "captain") && (
                        <p className="text-xs text-slate-600">{formatPhoneDisplay(captain.phone)}</p>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
              {assignedCaptains.length === 0 && (
                <p className="mt-2 text-right text-xs tabular-nums text-slate-600">
                  {slotFill.filled}/{slotFill.total} slots filled
                </p>
              )}

            </Link>
          );
        })}
      </div>
        </>
      )}

      {feedbackOpen && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>Share your thoughts on the portal</strong>.{" "}
          <Link href="/feedback" className="font-medium text-blue-800 underline">
            Leave feedback →
          </Link>
        </div>
      )}

    </div>
  );
}