"use client";

import {
  availabilitySelectionFromStorage,
  EVENT_DATE_OPTIONS,
  mergeAvailabilityToggle,
} from "@/lib/on-call-form";
import { formatEventDate, reorderForColumnMajorGrid, getShiftSchedule } from "@/lib/event-dates";
import { useEffect, useState } from "react";

/** Match `Input` primitive — public signup + captain manage forms. */
const fieldClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const sectionLabelClass = "mb-1 block text-xs font-medium text-slate-600";

const checkboxClass = "size-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500";

function ExclusiveCheckboxGroup({
  name,
  title,
  anyLabel,
  anyValue,
  options,
  initialValues,
  optionLayout = "wrap",
}: {
  name: string;
  title: string;
  anyLabel: string;
  anyValue: string;
  options: { value: string; label: string }[];
  initialValues: string;
  /** `columns` = CSS grid; only then apply column-major reorder. */
  optionLayout?: "wrap" | "columns";
}) {
  const [selected, setSelected] = useState(
    () => new Set(availabilitySelectionFromStorage(initialValues, anyValue))
  );

  useEffect(() => {
    setSelected(new Set(availabilitySelectionFromStorage(initialValues, anyValue)));
  }, [initialValues, anyValue]);

  function toggle(value: string) {
    setSelected((prev) => mergeAvailabilityToggle(prev, value, anyValue));
  }

  const selectedValues = [...selected];
  const optionItems =
    optionLayout === "columns" ? reorderForColumnMajorGrid(options) : options;

  return (
    <div>
      <p className={sectionLabelClass}>{title}</p>
      {selectedValues.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
      <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className={checkboxClass}
          checked={selected.has(anyValue)}
          onChange={() => toggle(anyValue)}
        />
        {anyLabel}
      </label>
      <div
        className={
          optionLayout === "columns"
            ? "grid w-fit grid-cols-2 gap-x-6 gap-y-2"
            : "flex flex-wrap gap-x-4 gap-y-2"
        }
      >
        {optionItems.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className={checkboxClass}
              checked={selected.has(option.value)}
              onChange={() => toggle(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function OnCallAvailabilityFields({
  noticeMinutes = 45,
  availableDates = "any",
  availableShifts = "any",
  availabilityNote = "",
  bilingual = false,
  eventDates = EVENT_DATE_OPTIONS,
}: {
  noticeMinutes?: number;
  availableDates?: string;
  availableShifts?: string;
  availabilityNote?: string;
  bilingual?: boolean;
  eventDates?: string[];
}) {
  return (
    <div className="space-y-4 sm:col-span-full">
      <div className="flex flex-wrap items-end gap-3">
        <label className="w-[7rem]">
          <span className={sectionLabelClass}>Notice (min)</span>
          <input
            name="notice_minutes"
            type="number"
            min={5}
            max={180}
            step={5}
            defaultValue={noticeMinutes}
            className={fieldClass}
            title="Minutes notice to arrive (typical 30–45)"
          />
        </label>
        <label className="min-w-[12rem] flex-1">
          <span className={sectionLabelClass}>Notes</span>
          <input
            name="availability"
            defaultValue={availabilityNote}
            placeholder="Prefers mornings…"
            className={fieldClass}
          />
        </label>
        <label className="flex items-center gap-2 pb-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            name="bilingual"
            className={checkboxClass}
            defaultChecked={bilingual}
          />
          Spanish
        </label>
      </div>

      <ExclusiveCheckboxGroup
        name="available_dates"
        title="Available event days"
        anyLabel="Any day"
        anyValue="any"
        initialValues={availableDates}
        optionLayout="columns"
        options={eventDates.map((d) => ({
          value: d,
          label: formatEventDate(d),
        }))}
      />

      <ExclusiveCheckboxGroup
        name="available_shifts"
        title="Available shifts"
        anyLabel="Any shift"
        anyValue="any"
        initialValues={availableShifts}
        options={getShiftSchedule().map((s) => ({
          value: String(s.num),
          label: `${s.num}. ${s.label}`,
        }))}
      />
    </div>
  );
}
