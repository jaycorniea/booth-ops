"use client";

import { ContactEmail, ContactPhone } from "@/components/ContactField";
import type { VolunteerFinderRecommendation, VolunteerFinderSlot } from "@/components/VolunteerFinderShell";
import type { Shift } from "@/lib/db";
import { formatShiftLabel, getShiftScheduleEntry, hasVolunteer } from "@/lib/event-dates";
import { formatVolunteerDisplayName } from "@/lib/volunteer-display-name";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Pool = "interested" | "on-call";

type ShiftNeed = {
  shift: Shift;
  openSlots: VolunteerFinderSlot[];
  noShow: boolean;
  shiftLabel: string;
};

function shiftNeeds(shift: Shift): ShiftNeed | null {
  const openSlots: VolunteerFinderSlot[] = [];
  for (const volunteer of shift.volunteers) {
    if (!hasVolunteer(volunteer.name)) openSlots.push(volunteer.slot_index);
  }
  const noShow = shift.no_show === 1;
  if (noShow && openSlots.length === 0) {
    for (const volunteer of shift.volunteers) openSlots.push(volunteer.slot_index);
  }
  if (!noShow && openSlots.length === 0) return null;
  return {
    shift,
    openSlots,
    noShow,
    shiftLabel: getShiftScheduleEntry(shift.shift_num)?.label ?? "",
  };
}

function slotLabel(slot: VolunteerFinderSlot): string {
  return `Vol ${slot}`;
}

function openSlotSummary(shift: Shift, openSlots: VolunteerFinderSlot[]): string {
  const parts: string[] = [];
  for (const slot of openSlots) {
    const volunteer = shift.volunteers.find((v) => v.slot_index === slot);
    if (!hasVolunteer(volunteer?.name)) parts.push(`Vol ${slot} open`);
  }
  return parts.join(" · ") || "Replacement";
}

const POOL_CONFIG = {
  interested: {
    label: "Interested",
    recommendationsPath: "/api/interested/recommendations",
    assignPath: "/api/interested/assign",
    empty: (
      <>
        No matches.{" "}
        <a href="/interested" className="underline">
          Interested pool
        </a>
      </>
    ),
    buildAssignBody: (
      rec: VolunteerFinderRecommendation,
      slot: VolunteerFinderSlot,
      shiftId: number,
      eventDate: string,
      shiftNum: number
    ) => ({
      shiftId,
      slot,
      interestedId: rec.id,
      eventDate,
      shiftNum,
    }),
  },
  "on-call": {
    label: "On-Call",
    recommendationsPath: "/api/on-call/recommendations",
    assignPath: "/api/on-call/assign",
    empty: (
      <>
        No matches.{" "}
        <a href="/on-call" className="underline">
          On-Call pool
        </a>
      </>
    ),
    buildAssignBody: (
      rec: VolunteerFinderRecommendation,
      slot: VolunteerFinderSlot,
      shiftId: number,
      eventDate: string,
      _shiftNum: number
    ) => ({
      shiftId,
      slot,
      onCallId: rec.id,
      eventDate,
    }),
  },
} as const;

function ShiftCoverageRow({
  need,
  eventDate,
  canWrite,
}: {
  need: ShiftNeed;
  eventDate: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const { shift, openSlots, noShow } = need;
  const [pool, setPool] = useState<Pool | null>(null);
  const [slot, setSlot] = useState<VolunteerFinderSlot>(openSlots[0] ?? 1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VolunteerFinderRecommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadPool(next: Pool) {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const cfg = POOL_CONFIG[next];
      const res = await fetch(
        `${cfg.recommendationsPath}?date=${eventDate}&shift=${shift.shift_num}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not load recommendations");
        setResults(null);
      } else {
        setResults(data.recommendations);
      }
    } catch {
      setError("Network error");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  async function selectPool(next: Pool) {
    if (pool === next) {
      setPool(null);
      setResults(null);
      setError(null);
      setMessage(null);
      return;
    }
    setPool(next);
    await loadPool(next);
  }

  async function assignVolunteer(rec: VolunteerFinderRecommendation) {
    if (!pool) return;
    const cfg = POOL_CONFIG[pool];
    const res = await fetch(cfg.assignPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        cfg.buildAssignBody(rec, slot, shift.id, eventDate, shift.shift_num)
      ),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not assign volunteer");
    } else {
      setMessage(`Assigned ${formatVolunteerDisplayName(rec.name)} as ${slotLabel(slot)}`);
      router.refresh();
    }
  }

  const btnClass =
    "rounded-md border px-2 py-0.5 text-[11px] font-medium transition disabled:opacity-60";
  const idleBtn = `${btnClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
  const activeInterested = `${btnClass} border-blue-600 bg-blue-50 text-blue-900`;
  const activeOnCall = `${btnClass} border-amber-600 bg-amber-50 text-amber-950`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="font-semibold text-slate-900">
          {formatShiftLabel(shift.shift_num)}
        </span>
        <span className="text-red-700/80">{openSlotSummary(shift, openSlots)}</span>
        {noShow ? (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900">
            No-Show
          </span>
        ) : null}

        {openSlots.length > 1 && (
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="text-slate-500">Fill</span>
            {openSlots.map((s) => (
              <label key={s} className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name={`fill-slot-${shift.id}`}
                  checked={slot === s}
                  onChange={() => setSlot(s)}
                />
                {slotLabel(s)}
              </label>
            ))}
          </span>
        )}

        <span className="ml-auto flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => void selectPool("interested")}
            className={pool === "interested" ? activeInterested : idleBtn}
          >
            Interested
          </button>
          <button
            type="button"
            onClick={() => void selectPool("on-call")}
            className={pool === "on-call" ? activeOnCall : idleBtn}
          >
            On-Call
          </button>
        </span>
      </div>

      {pool && (
        <div className="mt-1.5 border-t border-slate-100 pt-1.5">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span>
              {pool === "interested"
                ? "Planning pool — not on-call backup"
                : "Backup pool — call at T+15 for no-shows"}
            </span>
            <button
              type="button"
              onClick={() => void loadPool(pool)}
              disabled={loading}
              className="font-medium text-blue-700 underline disabled:opacity-60"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {error && <p className="text-xs text-red-700">{error}</p>}
          {message && <p className="text-xs text-green-700">{message}</p>}

          {results && results.length === 0 && (
            <p className="text-xs text-slate-600">{POOL_CONFIG[pool].empty}</p>
          )}

          {results && results.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {results.map((rec) => (
                <li
                  key={rec.id}
                  className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 py-1 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-slate-900">
                      {formatVolunteerDisplayName(rec.name)}
                    </span>
                    {rec.tier === "recommended" && (
                      <span className="ml-1.5 rounded bg-green-100 px-1 py-0.5 text-[10px] font-medium text-green-800">
                        Best
                      </span>
                    )}
                    {rec.bilingual && (
                      <span className="ml-1 rounded bg-sky-100 px-1 py-0.5 text-[10px] font-medium text-sky-800">
                        ES
                      </span>
                    )}
                    <span className="mt-0.5 flex flex-wrap gap-x-2 text-slate-600">
                      <ContactPhone
                        phone={rec.phone}
                        allowContact={canWrite}
                        className={
                          canWrite ? "text-blue-700 hover:underline" : "text-slate-600"
                        }
                      />
                      <ContactEmail
                        email={rec.email}
                        allowContact={canWrite}
                        className={
                          canWrite ? "text-blue-700 hover:underline" : "text-slate-600"
                        }
                      />
                    </span>
                    {rec.reasons.length > 0 && (
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {rec.reasons.join(" · ")}
                      </p>
                    )}
                  </div>
                  {canWrite && (
                    <span className="flex shrink-0 flex-wrap gap-1">
                      {rec.phone ? (
                        <a
                          href={`tel:${rec.phone.replace(/\s/g, "")}`}
                          className="rounded bg-blue-700 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-blue-800"
                        >
                          Call
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void assignVolunteer(rec)}
                        className="rounded border border-green-600 px-1.5 py-0.5 text-[11px] font-medium text-green-800 hover:bg-green-50"
                      >
                        Assign
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** PI/admin gap-fill — compact per-shift rows with Interested / On-Call pools. */
export function DayShiftOpsFillers({
  shifts,
  eventDate,
  canWrite,
}: {
  shifts: Shift[];
  eventDate: string;
  canWrite: boolean;
}) {
  const needs = shifts.map(shiftNeeds).filter((row): row is ShiftNeed => row != null);
  if (needs.length === 0) return null;

  return (
    <section className="space-y-1.5 no-print">
      <p className="text-xs font-semibold text-slate-800">Open Slots & Coverage</p>
      <div className="space-y-1.5">
        {needs.map((need) => (
          <ShiftCoverageRow
            key={need.shift.id}
            need={need}
            eventDate={eventDate}
            canWrite={canWrite}
          />
        ))}
      </div>
    </section>
  );
}
