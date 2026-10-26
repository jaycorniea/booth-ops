"use client";

import { Input, Label } from "@/components/ui";
import { getShiftSchedule } from "@/lib/event-dates";
import { splitAvailability } from "@/lib/on-call-form";
import { useState } from "react";

const checkboxClass = "size-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500";

function initialSelection(values: string[], anyValue: string): Set<string> {
  if (values.includes(anyValue)) return new Set([anyValue]);
  return new Set(values);
}

export function DayShiftAvailabilityFields({
  openShiftNums,
  availableShifts = "any",
  notes = "",
  bilingual = false,
  showTicketReimburse = false,
}: {
  openShiftNums?: number[];
  availableShifts?: string;
  notes?: string;
  bilingual?: boolean;
  /** Optional. */
  showTicketReimburse?: boolean;
}) {
  const shiftOptions = openShiftNums
    ? getShiftSchedule().filter((s) => openShiftNums.includes(s.num))
    : getShiftSchedule();
  const parsed = splitAvailability(availableShifts);
  const [selected, setSelected] = useState(() => {
    if (openShiftNums?.length === 1) return new Set([String(openShiftNums[0])]);
    return initialSelection(parsed, "any");
  });

  function toggle(value: string) {
    setSelected((prev) => {
      if (value === "any") return new Set(["any"]);
      const next = new Set(prev);
      next.delete("any");
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  if (openShiftNums && shiftOptions.length === 0) {
    return (
      <p className="sm:col-span-2 text-sm text-slate-600">
        No shifts available on this day — all volunteer slots are filled.
      </p>
    );
  }

  return (
    <>
      <div className="sm:col-span-2">
        <Label>Available shifts on this day</Label>
        {shiftOptions.length > 1 && (
          <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className={checkboxClass}
              name={selected.has("any") ? "available_shifts" : undefined}
              value="any"
              checked={selected.has("any")}
              onChange={() => toggle("any")}
            />
            Any available shift
          </label>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          {shiftOptions.map((s) => (
            <label key={s.num} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className={checkboxClass}
                name={!selected.has("any") && selected.has(String(s.num)) ? "available_shifts" : undefined}
                value={String(s.num)}
                checked={selected.has(String(s.num))}
                onChange={() => toggle(String(s.num))}
              />
              {s.num}. {s.label}
            </label>
          ))}
        </div>
      </div>

      <div className="sm:col-span-2">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="bilingual" className={checkboxClass} defaultChecked={bilingual} />
          Spanish speaker
        </label>
      </div>

      <div className="sm:col-span-2">
        <Label>Notes</Label>
        <Input
          name="notes"
          defaultValue={notes}
          placeholder="e.g. morning only, first time at the booth"
        />
      </div>
    </>
  );
}