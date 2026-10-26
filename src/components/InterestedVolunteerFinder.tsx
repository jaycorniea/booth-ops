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
  openSlots: VolunteerFinderSlot[];
  canWrite?: boolean;
}

export function InterestedVolunteerFinder({
  eventDate,
  shiftId,
  shiftNum,
  shiftLabel,
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
      defaultOpen={openSlots.length > 0}
      theme="blue"
      toggleLabel="Fill from interested roster"
      contextHelp="People who reached out about volunteering — not the on-call no-show pool."
      slotRadioName={`interested-slot-${shiftId}`}
      recommendationsPath="/api/interested/recommendations"
      assignPath="/api/interested/assign"
      loadErrorMessage="Could not load roster"
      buildAssignBody={(rec, slot) => ({
        shiftId,
        slot,
        interestedId: rec.id,
        eventDate,
        shiftNum,
      })}
      emptyState={
        <>
          No interested volunteers match this day and shift.{" "}
          <a href="/interested" className="underline">
            Add to roster
          </a>{" "}
          or widen their availability.
        </>
      }
    />
  );
}
