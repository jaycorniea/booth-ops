"use client";

import {
  VolunteerFinderShell,
  type VolunteerFinderSlot,
} from "@/components/VolunteerFinderShell";

interface Props {
  eventDate: string;
  shiftId: number;
  shiftNum: number;
  shiftLabel: string;
  needsReplacement: boolean;
  openSlots: VolunteerFinderSlot[];
  canWrite?: boolean;
}

export function OnCallFinder({
  eventDate,
  shiftId,
  shiftNum,
  shiftLabel,
  needsReplacement,
  openSlots,
  canWrite = true,
}: Props) {
  return (
    <VolunteerFinderShell
      eventDate={eventDate}
      shiftNum={shiftNum}
      shiftLabel={shiftLabel}
      openSlots={openSlots}
      canWrite={canWrite}
      defaultOpen={needsReplacement}
      theme="amber"
      toggleLabel="Find on-call replacement"
      toggleSuffix={needsReplacement ? " (no-show)" : ""}
      contextHelp="Call at T+15 if scheduled volunteer no-shows."
      slotRadioName={`on-call-slot-${shiftId}`}
      recommendationsPath="/api/on-call/recommendations"
      assignPath="/api/on-call/assign"
      buildAssignBody={(rec, slot) => ({
        shiftId,
        slot,
        onCallId: rec.id,
        eventDate,
      })}
      emptyState={
        <>
          No on-call volunteers match this day and shift.{" "}
          <a href="/on-call" className="underline">
            Update the pool
          </a>{" "}
          or widen availability.
        </>
      }
    />
  );
}
