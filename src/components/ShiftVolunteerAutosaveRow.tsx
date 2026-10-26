"use client";

import { SpreadsheetFieldLead } from "@/components/SpreadsheetContactLink";
import {
  saveShiftRowAction,
  toggleShiftCheckInAction,
  toggleShiftNoShowAction,
} from "@/lib/actions";
import type { Shift, ShiftVolunteer } from "@/lib/db";
import { formatVolunteerDisplayName } from "@/lib/volunteer-display-name";
import { formatPhoneDisplay } from "@/lib/phone-format";
import {
  officialSlotIndexes,
  padVolunteers,
  slotEmailKey,
  slotNameKey,
  slotPhoneKey,
  volunteerSlotLabel,
} from "@/lib/shift-slots";
import {
  SHIFT_COL_CHECKIN,
  SHIFT_COL_NOSHOW,
  SHIFT_COL_SHIFT,
  SHIFT_COL_STACK,
  SHIFT_SPREADSHEET_CELL,
  MOBILE_FIELD_LABEL,
  SPREADSHEET_INPUT,
} from "@/components/spreadsheet-table-styles";
import { useCallback, useEffect, useRef, useState } from "react";

const SAVED_INDICATOR_MS = 1800;

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

function draftFromShift(shift: Shift): ShiftVolunteer[] {
  return padVolunteers(shift.volunteers).map((v) => ({
    slot_index: v.slot_index,
    name: v.name ?? "",
    phone: v.phone ?? "",
    email: v.email ?? "",
  }));
}

function normalizeDraft(draft: ShiftVolunteer[]): ShiftVolunteer[] {
  return draft.map((v) => ({
    ...v,
    name: formatVolunteerDisplayName(v.name),
    phone: formatPhoneDisplay(v.phone),
  }));
}

function draftsEqual(a: ShiftVolunteer[], b: ShiftVolunteer[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((row, i) => {
    const other = b[i];
    return (
      row.slot_index === other.slot_index &&
      row.name === other.name &&
      row.phone === other.phone &&
      row.email === other.email
    );
  });
}

function ShiftCellLabel({ shiftLabel, saveState }: { shiftLabel: string; saveState: SaveState }) {
  const showStatus = saveState === "saving" || saveState === "saved" || saveState === "error";
  const statusText =
    saveState === "saving" ? "Saving…" : saveState === "saved" ? "✓ Saved" : "Save failed";
  const statusClass =
    saveState === "saving"
      ? "font-medium text-slate-500"
      : saveState === "saved"
        ? "font-semibold text-green-700"
        : "font-semibold text-red-600";

  return (
    <div className="relative min-h-[1.125rem]">
      <span
        className={`block whitespace-nowrap text-xs transition-opacity duration-150 ${
          showStatus ? "opacity-0" : "opacity-100"
        }`}
        aria-hidden={showStatus}
      >
        {shiftLabel}
      </span>
      {showStatus ? (
        <span
          className={`absolute inset-0 flex items-center whitespace-nowrap text-[0.65rem] ${statusClass}`}
          role={saveState === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {statusText}
        </span>
      ) : null}
    </div>
  );
}

function rowStatusClass(saveState: SaveState): string {
  if (saveState === "saved") return "bg-green-50/90";
  if (saveState === "saving") return "bg-slate-50";
  if (saveState === "error") return "bg-red-50/90";
  return "hover:bg-slate-50/60";
}

export function ShiftVolunteerAutosaveRow({
  shift,
  shiftLabel,
  eventDate,
  allowContact = false,
  allowCheckIn = false,
  allowNoShow = false,
  layout = "row",
}: {
  shift: Shift;
  shiftLabel: string;
  eventDate: string;
  allowContact?: boolean;
  allowCheckIn?: boolean;
  allowNoShow?: boolean;
  allowTicketReimburse?: boolean;
  layout?: "row" | "card";
}) {
  const [draft, setDraft] = useState(() => draftFromShift(shift));
  const [checkedIn, setCheckedIn] = useState(shift.checked_in === 1);
  const [checkInState, setCheckInState] = useState<"idle" | "saving" | "error">("idle");
  const [noShow, setNoShow] = useState(shift.no_show === 1);
  const [noShowState, setNoShowState] = useState<"idle" | "saving" | "error">("idle");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const savedRef = useRef(draftFromShift(shift));
  const draftRef = useRef(draft);
  const savingRef = useRef(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rowRef = useRef<HTMLTableRowElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  draftRef.current = draft;

  useEffect(() => {
    const synced = draftFromShift(shift);
    setDraft((prev) => {
      if (!prev || draftsEqual(prev, synced)) {
        savedRef.current = synced;
        return synced;
      }
      return prev;
    });
    setCheckedIn(shift.checked_in === 1);
    setNoShow(shift.no_show === 1);
  }, [shift]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const saveRow = useCallback(async () => {
    if (savingRef.current) return;
    const current = draftRef.current;
    const saved = savedRef.current;
    if (draftsEqual(current, saved)) {
      setSaveState("idle");
      return;
    }
    savingRef.current = true;
    setSaveState("saving");
    try {
      const result = await saveShiftRowAction(shift.id, {
        eventDate,
        volunteers: current,
      });
      if (!result.ok) throw new Error(result.error);
      const synced = normalizeDraft(current);
      savedRef.current = synced;
      setDraft(synced);
      draftRef.current = synced;
      setSaveState("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveState("idle"), SAVED_INDICATOR_MS);
    } catch {
      setSaveState("error");
    } finally {
      savingRef.current = false;
    }
  }, [eventDate, shift.id]);

  const updateVolunteer = useCallback((slotIndex: number, field: "name" | "phone" | "email", value: string) => {
    setDraft((prev) => {
      const next = prev.map((row) =>
        row.slot_index === slotIndex ? { ...row, [field]: value } : row
      );
      draftRef.current = next;
      return next;
    });
    queueMicrotask(() => {
      const next = draftRef.current;
      const saved = savedRef.current;
      setSaveState((prev) =>
        prev === "saving" ? "saving" : draftsEqual(next, saved) ? "idle" : "dirty"
      );
    });
  }, []);

  const handleFieldBlur = useCallback(() => {
    queueMicrotask(() => {
      const active = document.activeElement;
      const inRow = rowRef.current?.contains(active) || cardRef.current?.contains(active);
      if (!inRow) void saveRow();
    });
  }, [saveRow]);

  const handleCheckInChange = useCallback(
    async (next: boolean) => {
      setCheckedIn(next);
      setCheckInState("saving");
      const result = await toggleShiftCheckInAction(shift.id, eventDate, next);
      if (!result.ok) {
        setCheckedIn(!next);
        setCheckInState("error");
        return;
      }
      setCheckInState("idle");
    },
    [eventDate, shift.id]
  );

  const handleNoShowChange = useCallback(
    async (next: boolean) => {
      setNoShow(next);
      setNoShowState("saving");
      const result = await toggleShiftNoShowAction(shift.id, eventDate, next);
      if (!result.ok) {
        setNoShow(!next);
        setNoShowState("error");
        return;
      }
      setNoShowState("idle");
    },
    [eventDate, shift.id]
  );

  const slots = officialSlotIndexes();
  const checkInCell = allowCheckIn ? (
    <td className={`${SHIFT_SPREADSHEET_CELL} ${SHIFT_COL_CHECKIN} text-center`}>
      <input
        type="checkbox"
        checked={checkedIn}
        onChange={(e) => void handleCheckInChange(e.target.checked)}
        aria-label={`Checked in ${shiftLabel}`}
        className="h-4 w-4 rounded border-slate-300"
      />
      {checkInState === "error" ? (
        <span className="sr-only" role="alert">
          Check-in failed
        </span>
      ) : null}
    </td>
  ) : null;

  const noShowCell = allowNoShow ? (
    <td className={`${SHIFT_SPREADSHEET_CELL} ${SHIFT_COL_NOSHOW} text-center`}>
      <input
        type="checkbox"
        checked={noShow}
        onChange={(e) => void handleNoShowChange(e.target.checked)}
        aria-label={`No show ${shiftLabel}`}
        className="h-4 w-4 rounded border-slate-300"
      />
      {noShowState === "error" ? (
        <span className="sr-only" role="alert">
          No-show update failed
        </span>
      ) : null}
    </td>
  ) : null;

  const volunteerCells = draft.map((volunteer) => {
    const label = volunteerSlotLabel(volunteer.slot_index);
    return (
      <td key={volunteer.slot_index} className={`${SHIFT_SPREADSHEET_CELL} ${SHIFT_COL_STACK}`}>
        <div className="space-y-1">
          <input
            name={slotNameKey(volunteer.slot_index)}
            type="text"
            value={volunteer.name}
            onChange={(e) => updateVolunteer(volunteer.slot_index, "name", e.target.value)}
            onBlur={handleFieldBlur}
            placeholder="Name"
            aria-label={`${label} name`}
            className={SPREADSHEET_INPUT}
          />
          <div className="flex min-w-0 items-center gap-1">
            <SpreadsheetFieldLead
              kind="phone"
              value={volunteer.phone}
              slotLabel={label}
              allowContact={allowContact}
            />
            <input
              name={slotPhoneKey(volunteer.slot_index)}
              type="tel"
              value={volunteer.phone}
              onChange={(e) => updateVolunteer(volunteer.slot_index, "phone", e.target.value)}
              onBlur={handleFieldBlur}
              placeholder="Phone"
              aria-label={`${label} phone`}
              className={`${SPREADSHEET_INPUT} tabular-nums`}
            />
          </div>
          <div className="flex min-w-0 items-center gap-1">
            <SpreadsheetFieldLead
              kind="email"
              value={volunteer.email}
              slotLabel={label}
              allowContact={allowContact}
            />
            <input
              name={slotEmailKey(volunteer.slot_index)}
              type="email"
              value={volunteer.email}
              onChange={(e) => updateVolunteer(volunteer.slot_index, "email", e.target.value)}
              onBlur={handleFieldBlur}
              placeholder="Email"
              aria-label={`${label} email`}
              className={SPREADSHEET_INPUT}
            />
          </div>
        </div>
      </td>
    );
  });

  if (layout === "card") {
    return (
      <div ref={cardRef} className={`space-y-2 rounded-lg border border-slate-200 p-3 ${rowStatusClass(saveState)}`}>
        <p className="text-xs font-semibold text-slate-700">
          <ShiftCellLabel shiftLabel={shiftLabel} saveState={saveState} />
        </p>
        {draft.map((volunteer) => (
          <div key={volunteer.slot_index} className="space-y-1 border-t border-slate-100 pt-2">
            <p className={`${MOBILE_FIELD_LABEL}`}>{volunteerSlotLabel(volunteer.slot_index)}</p>
            <input
              type="text"
              value={volunteer.name}
              onChange={(e) => updateVolunteer(volunteer.slot_index, "name", e.target.value)}
              onBlur={handleFieldBlur}
              placeholder="Name"
              className={SPREADSHEET_INPUT}
            />
            <input
              type="tel"
              value={volunteer.phone}
              onChange={(e) => updateVolunteer(volunteer.slot_index, "phone", e.target.value)}
              onBlur={handleFieldBlur}
              placeholder="Phone"
              className={SPREADSHEET_INPUT}
            />
            <input
              type="email"
              value={volunteer.email}
              onChange={(e) => updateVolunteer(volunteer.slot_index, "email", e.target.value)}
              onBlur={handleFieldBlur}
              placeholder="Email"
              className={SPREADSHEET_INPUT}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <tr ref={rowRef} className={rowStatusClass(saveState)}>
      {checkInCell}
      {noShowCell}
      <td className={`${SHIFT_SPREADSHEET_CELL} ${SHIFT_COL_SHIFT} font-medium text-slate-800`}>
        <ShiftCellLabel shiftLabel={shiftLabel} saveState={saveState} />
      </td>
      {volunteerCells}
    </tr>
  );
}
