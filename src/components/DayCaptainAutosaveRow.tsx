"use client";


import { saveDayCaptainRowAction } from "@/lib/actions";
import type { CaptainSlotConfig } from "@/lib/day-captain-slots";
import type { DayCaptainRow } from "@/lib/db";
import {
  CAPTAIN_COL_DISTRICT,
  CAPTAIN_COL_EMAIL,
  CAPTAIN_COL_NAME,
  CAPTAIN_COL_PHONE,
  CAPTAIN_COL_ROLE,
  SPREADSHEET_CELL,
  SPREADSHEET_EMAIL_INPUT,
  SPREADSHEET_INPUT,
  SPREADSHEET_SELECT,
  MOBILE_FIELD_LABEL,
} from "@/components/spreadsheet-table-styles";
import { formatVolunteerDisplayName } from "@/lib/volunteer-display-name";
import { formatPhoneDisplay } from "@/lib/phone-format";
import { useCallback, useEffect, useRef, useState } from "react";

const SAVED_INDICATOR_MS = 1800;

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type CaptainDraft = {
  name: string;
  phone: string;
  email: string;
  district: string;
};

function draftFromCaptain(captain?: DayCaptainRow): CaptainDraft {
  return {
    name: captain?.name ?? "",
    phone: captain?.phone ?? "",
    email: captain?.email ?? "",
    district: captain?.district ?? "",
  };
}

function normalizeDraft(draft: CaptainDraft): CaptainDraft {
  return {
    ...draft,
    name: formatVolunteerDisplayName(draft.name),
    phone: formatPhoneDisplay(draft.phone),
  };
}

function draftsEqual(a: CaptainDraft, b: CaptainDraft): boolean {
  return (
    a.name === b.name &&
    a.phone === b.phone &&
    a.email === b.email &&
    a.district === b.district
  );
}

function RoleCellLabel({
  cfg,
  saveState,
}: {
  cfg: CaptainSlotConfig;
  saveState: SaveState;
}) {
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
    <div className="relative min-h-[1.75rem]">
      <div
        className={`transition-opacity duration-150 ${showStatus ? "opacity-0" : "opacity-100"}`}
        aria-hidden={showStatus}
      >
        <span className="block font-medium text-slate-800">{cfg.label}</span>
        <span className="text-[0.65rem] font-normal text-slate-500">{cfg.timeRange}</span>
      </div>
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

export function DayCaptainAutosaveRow({
  cfg,
  captain,
  eventDate,
  layout = "row",
}: {
  cfg: CaptainSlotConfig;
  captain?: DayCaptainRow;
  eventDate: string;
  layout?: "row" | "card";
}) {
  const [draft, setDraft] = useState(() => draftFromCaptain(captain));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const savedRef = useRef(draftFromCaptain(captain));
  const draftRef = useRef(draft);
  const savingRef = useRef(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rowRef = useRef<HTMLTableRowElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  draftRef.current = draft;

  useEffect(() => {
    const synced = draftFromCaptain(captain);
    setDraft((prev) => {
      if (!prev || draftsEqual(prev, synced)) {
        savedRef.current = synced;
        return synced;
      }
      return prev;
    });
  }, [captain]);

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
      const result = await saveDayCaptainRowAction(cfg.slot, { eventDate, ...current });
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
  }, [cfg.slot, eventDate]);

  const updateField = useCallback((field: keyof CaptainDraft, value: string) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value };
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
      if (!rowRef.current?.contains(active) && !cardRef.current?.contains(active)) {
        void saveRow();
      }
    });
  }, [saveRow]);

  const fieldBlocks = (
    <>
      <div>
        <span className={MOBILE_FIELD_LABEL}>Name</span>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => updateField("name", e.target.value)}
          onBlur={handleFieldBlur}
          placeholder="Name"
          aria-label={`${cfg.label} name`}
          className={SPREADSHEET_INPUT}
        />
      </div>
      <div>
        <span className={MOBILE_FIELD_LABEL}>Phone</span>
        <input
          type="tel"
          value={draft.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          onBlur={handleFieldBlur}
          placeholder="Phone"
          aria-label={`${cfg.label} phone`}
          className={SPREADSHEET_INPUT}
        />
      </div>
      <div>
        <span className={MOBILE_FIELD_LABEL}>Email</span>
        <input
          type="email"
          value={draft.email}
          onChange={(e) => updateField("email", e.target.value)}
          onBlur={handleFieldBlur}
          placeholder="Email"
          aria-label={`${cfg.label} email`}
          className={SPREADSHEET_EMAIL_INPUT}
        />
      </div>

    </>
  );

  if (layout === "card") {
    return (
      <div
        ref={cardRef}
        className={`rounded border border-slate-200 px-3 py-2 transition-colors duration-150 ${rowStatusClass(saveState)}`}
      >
        <RoleCellLabel cfg={cfg} saveState={saveState} />
        <div className="mt-2 space-y-2">{fieldBlocks}</div>
      </div>
    );
  }

  return (
    <tr
      ref={rowRef}
      className={`transition-colors duration-150 ${rowStatusClass(saveState)}`}
    >
      <td className={`${SPREADSHEET_CELL} ${CAPTAIN_COL_ROLE}`}>
        <RoleCellLabel cfg={cfg} saveState={saveState} />
      </td>
      <td className={`${SPREADSHEET_CELL} ${CAPTAIN_COL_NAME}`}>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => updateField("name", e.target.value)}
          onBlur={handleFieldBlur}
          placeholder="Name"
          aria-label={`${cfg.label} name`}
          className={SPREADSHEET_INPUT}
        />
      </td>
      <td className={`${SPREADSHEET_CELL} ${CAPTAIN_COL_PHONE}`}>
        <input
          type="tel"
          value={draft.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          onBlur={handleFieldBlur}
          placeholder="Phone"
          aria-label={`${cfg.label} phone`}
          className={SPREADSHEET_INPUT}
        />
      </td>
      <td className={`${SPREADSHEET_CELL} ${CAPTAIN_COL_EMAIL}`}>
        <input
          type="email"
          value={draft.email}
          onChange={(e) => updateField("email", e.target.value)}
          onBlur={handleFieldBlur}
          placeholder="Email"
          aria-label={`${cfg.label} email`}
          className={SPREADSHEET_EMAIL_INPUT}
        />
      </td>
      <td className={`${SPREADSHEET_CELL} ${CAPTAIN_COL_DISTRICT}`}>
        <span className="text-slate-400">—</span>
      </td>
    </tr>
  );
}
