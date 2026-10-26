import { getActiveEventSettings } from "./event-settings";
import { getShiftSchedule } from "./event-dates";

export type CaptainSlot = "full" | "am" | "pm";

export interface CaptainSlotConfig {
  slot: CaptainSlot;
  label: string;
  timeRange: string;
  shiftNums: number[];
}

export function isSplitCaptainDay(eventDate: string): boolean {
  const split = getActiveEventSettings().splitCaptainDate;
  return Boolean(split) && eventDate === split;
}

export function getCaptainSlotsForDate(eventDate: string): CaptainSlotConfig[] {
  const settings = getActiveEventSettings();
  if (isSplitCaptainDay(eventDate)) {
    const { am, pm } = settings.captainSplit;
    return [
      { slot: "am", label: `${am.label} day captain`, timeRange: am.timeRange, shiftNums: am.shiftNums },
      { slot: "pm", label: `${pm.label} day captain`, timeRange: pm.timeRange, shiftNums: pm.shiftNums },
    ];
  }
  return [
    {
      slot: "full",
      label: "Day captain",
      timeRange: settings.boothHours,
      shiftNums: getShiftSchedule().map((s) => s.num),
    },
  ];
}

export function totalCaptainSlots(eventDates: string[]): number {
  return eventDates.reduce((sum, date) => sum + getCaptainSlotsForDate(date).length, 0);
}

export function hasAllDayCaptainsAssigned(
  eventDate: string,
  captains: { captain_slot: CaptainSlot; name?: string | null }[]
): boolean {
  const required = getCaptainSlotsForDate(eventDate);
  return required.every((cfg) => {
    const row = captains.find((c) => c.captain_slot === cfg.slot);
    return Boolean(row?.name?.trim());
  });
}

export function formatCaptainSlotSummary(
  eventDate: string,
  captains: { captain_slot: CaptainSlot; name?: string | null }[]
): string {
  const slots = getCaptainSlotsForDate(eventDate);
  if (!isSplitCaptainDay(eventDate)) {
    const captain = captains.find((c) => c.captain_slot === "full");
    return captain?.name?.trim() ?? "";
  }
  return slots
    .map((cfg) => {
      const captain = captains.find((c) => c.captain_slot === cfg.slot);
      const name = captain?.name?.trim();
      return name ? `${name} (${cfg.timeRange})` : `${cfg.timeRange}: open`;
    })
    .join(" · ");
}
