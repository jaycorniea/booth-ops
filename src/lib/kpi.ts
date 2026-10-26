import { getCaptainSlotsForDate, hasAllDayCaptainsAssigned } from "./day-captain-slots";
import { listAllShifts, listDayCaptains, listIssues, listOnCall } from "./db";
import {
  daysUntilEventOpen,
  getEventDates,
  getEventOpen,
  getEventPhase,
  getShiftSchedule,
} from "./event-dates";
import { countShiftSlots, refreshShiftSlotsKpiSnapshot } from "./kpi-snapshots";
import {
  buildShiftSlotsDailyHistory,
  type ShiftSlotsDailyBar,
  type ShiftSlotsHistorySummary,
} from "./shift-slots-history";
import { ON_CALL_ACTIVE_STATUSES } from "./on-call-status";
import { centralDateString } from "./portal-time";
import { officialSlotsPerShift } from "./shift-slots";

export type { ShiftSlotsDailyBar, ShiftSlotsHistorySummary };

export interface CoverageMetric {
  filled: number;
  total: number;
  percent: number;
  label: string;
  detail?: string;
}

export interface PreEventKpis {
  phase: "pre-event" | "during-event" | "post-event";
  today: string;
  daysUntilOpen: number;
  captains: CoverageMetric;
  shiftSlots: CoverageMetric;
  onCallActive: number;
  onCallPending: number;
  shiftSlotsHistory: ShiftSlotsHistorySummary;
}

export interface DuringEventKpis {
  elapsedDays: number;
  totalEventDays: number;
  noShows: number;
  checkIns: number;
  onCallDeployments: number;
  issuesOpen: number;
  issuesResolved: number;
}

function percent(filled: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((filled / total) * 1000) / 10;
}

function coverage(filled: number, total: number, label: string, detail?: string): CoverageMetric {
  return { filled, total, percent: percent(filled, total), label, detail };
}

function elapsedEventDates(today: string): string[] {
  return getEventDates().filter((d) => d <= today && d >= getEventOpen());
}

export async function getPreEventKpis(today = centralDateString()): Promise<PreEventKpis> {
  const eventDates = getEventDates();
  const [shiftRows, captainRows, onCallList] = await Promise.all([
    listAllShifts(),
    listDayCaptains(),
    listOnCall(),
  ]);

  const shiftsByDate = new Map<string, typeof shiftRows>();
  for (const shift of shiftRows) {
    const list = shiftsByDate.get(shift.event_date) ?? [];
    list.push(shift);
    shiftsByDate.set(shift.event_date, list);
  }
  const captainsByDate = new Map<string, typeof captainRows>();
  for (const captain of captainRows) {
    const list = captainsByDate.get(captain.event_date) ?? [];
    list.push(captain);
    captainsByDate.set(captain.event_date, list);
  }

  const captainsFilled = eventDates.filter((date) => {
    const dayRows = captainsByDate.get(date) ?? [];
    const slots = getCaptainSlotsForDate(date);
    const captains = slots.map((cfg) => dayRows.find((r) => r.captain_slot === cfg.slot) ?? {
      event_date: date,
      captain_slot: cfg.slot,
      name: "",
      phone: "",
      email: "",
    });
    return hasAllDayCaptainsAssigned(date, captains);
  }).length;

  let slotsFilled = 0;
  let slotsTotal = 0;
  for (const date of eventDates) {
    const shifts = shiftsByDate.get(date) ?? [];
    const { filled, total } = countShiftSlots(shifts);
    slotsFilled += filled;
    slotsTotal += total;
  }

  const activeOnCall = onCallList.filter((v) => ON_CALL_ACTIVE_STATUSES.includes(v.status));
  await refreshShiftSlotsKpiSnapshot(today);
  const shiftSlotsHistory = await buildShiftSlotsDailyHistory(today);
  const shiftCount = getShiftSchedule().length;
  const perShift = officialSlotsPerShift();

  return {
    phase: getEventPhase(today),
    today,
    daysUntilOpen: daysUntilEventOpen(today),
    captains: coverage(
      captainsFilled,
      eventDates.length,
      "Day captains assigned",
      `${captainsFilled} of ${eventDates.length} event days`
    ),
    shiftSlots: coverage(
      slotsFilled,
      slotsTotal,
      "Shift volunteer slots filled",
      `${slotsFilled} of ${slotsTotal} slots (${shiftCount} shifts × ${perShift} volunteers per day)`
    ),
    onCallActive: activeOnCall.length,
    onCallPending: onCallList.filter((v) => v.status === "new").length,
    shiftSlotsHistory,
  };
}

export async function getDuringEventKpis(today = centralDateString()): Promise<DuringEventKpis> {
  const eventDates = getEventDates();
  const elapsed = elapsedEventDates(today);
  const elapsedSet = new Set(elapsed);
  const [issues, shiftRows] = await Promise.all([listIssues(), listAllShifts()]);
  const elapsedShifts = shiftRows.filter((shift) => elapsedSet.has(shift.event_date));
  return {
    elapsedDays: elapsed.length,
    totalEventDays: eventDates.length,
    noShows: elapsedShifts.filter((s) => s.no_show === 1).length,
    checkIns: elapsedShifts.filter((s) => s.checked_in === 1).length,
    onCallDeployments: 0,
    issuesOpen: issues.filter((i) => i.resolved === 0).length,
    issuesResolved: issues.filter((i) => i.resolved === 1).length,
  };
}
