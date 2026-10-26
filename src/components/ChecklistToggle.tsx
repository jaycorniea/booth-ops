"use client";

import { setChecklistAction } from "@/lib/actions";
import { useTransition } from "react";

export function ChecklistToggle({
  eventDate,
  itemKey,
  label,
  checked,
  canWrite = true,
  compact = false,
}: {
  eventDate: string;
  itemKey: string;
  label: string;
  checked: boolean;
  canWrite?: boolean;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <label
      className={`flex items-start gap-1.5 ${compact ? "py-0.5" : "rounded-lg p-2"} ${canWrite ? "cursor-pointer hover:bg-slate-50" : ""} ${pending ? "opacity-60" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={!canWrite}
        onChange={(e) => start(() => setChecklistAction(eventDate, itemKey, e.target.checked))}
        className={`${compact ? "mt-0.5 h-3.5 w-3.5" : "mt-0.5 h-4 w-4"} rounded border-slate-300 disabled:cursor-not-allowed`}
      />
      <span className={compact ? "text-xs text-slate-700" : "text-sm text-slate-700"}>{label}</span>
    </label>
  );
}