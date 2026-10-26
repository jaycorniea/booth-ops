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
