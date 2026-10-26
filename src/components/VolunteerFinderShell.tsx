"use client";

import { ContactEmail, ContactPhone } from "@/components/ContactField";
import { formatVolunteerDisplayName } from "@/lib/volunteer-display-name";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

export type VolunteerFinderRecommendation = {
  id: number;
  name: string;
  phone: string;
  email: string;
  bilingual: boolean;
  tier: "recommended" | "possible";
  reasons: string[];
};

export type VolunteerFinderSlot = number;

export type VolunteerFinderTheme = "blue" | "amber";

const THEME_CLASS: Record<
  VolunteerFinderTheme,
  {
    container: string;
    toggle: string;
    context: string;
    refresh: string;
    empty: string;
  }
> = {
  blue: {
    container: "border-blue-200 bg-blue-50",
    toggle: "text-blue-900 hover:text-blue-950",
    context: "text-blue-800",
    refresh:
      "rounded border border-blue-300 bg-white px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-60",
    empty: "text-blue-900",
  },
  amber: {
    container: "border-amber-200 bg-amber-50",
    toggle: "text-amber-900 hover:text-amber-950",
    context: "text-amber-800",
    refresh:
      "rounded border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60",
    empty: "text-amber-900",
  },
};

export type VolunteerFinderShellProps = {
  eventDate: string;
  shiftNum: number;
  shiftLabel: string;
  openSlots: VolunteerFinderSlot[];
  canWrite?: boolean;
  defaultOpen?: boolean;
  theme: VolunteerFinderTheme;
  toggleLabel: string;
  toggleSuffix?: string;
  contextHelp: string;
  slotRadioName: string;
  recommendationsPath: string;
  assignPath: string;
  buildAssignBody: (rec: VolunteerFinderRecommendation, slot: VolunteerFinderSlot) => Record<string, unknown>;
  emptyState: ReactNode;
  loadErrorMessage?: string;
};

export function VolunteerFinderShell({
  eventDate,
  shiftNum,
  shiftLabel,
  openSlots,
  canWrite = true,
  defaultOpen = false,
  theme,
  toggleLabel,
  toggleSuffix,
  contextHelp,
  slotRadioName,
  recommendationsPath,
  assignPath,
  buildAssignBody,
  emptyState,
  loadErrorMessage = "Could not load recommendations",
}: VolunteerFinderShellProps) {
  const router = useRouter();
  const styles = THEME_CLASS[theme];
  const [open, setOpen] = useState(defaultOpen);
  const [slot, setSlot] = useState<VolunteerFinderSlot>(openSlots[0] ?? 1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VolunteerFinderRecommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadRecommendations() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`${recommendationsPath}?date=${eventDate}&shift=${shiftNum}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? loadErrorMessage);
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

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !results) await loadRecommendations();
  }

  async function assignVolunteer(rec: VolunteerFinderRecommendation) {
    const res = await fetch(assignPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildAssignBody(rec, slot)),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not assign volunteer");
    } else {
      setMessage(
        `Assigned ${formatVolunteerDisplayName(rec.name)} as Volunteer ${slot}`
      );
      router.refresh();
    }
  }

  if (!openSlots.length) return null;

  return (
    <div className={`mt-4 rounded-lg border p-3 no-print ${styles.container}`}>
      <button type="button" onClick={handleOpen} className={`text-sm font-medium ${styles.toggle}`}>
        {open ? "▾" : "▸"} {toggleLabel}
        {toggleSuffix ?? ""}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className={`text-xs ${styles.context}`}>
            Shift {shiftNum} ({shiftLabel}). {contextHelp}
          </p>

          {openSlots.length > 1 && (
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="text-slate-600">Fill slot:</span>
              {openSlots.map((s) => (
                <label key={s} className="flex items-center gap-1">
                  <input
                    type="radio"
                    name={slotRadioName}
                    checked={slot === s}
                    onChange={() => setSlot(s)}
                  />
                  {`Volunteer ${s}`}
                </label>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={loadRecommendations}
            disabled={loading}
            className={styles.refresh}
          >
            {loading ? "Loading…" : "Refresh list"}
          </button>

          {error && <p className="text-sm text-red-700">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}

          {results && results.length === 0 && (
            <p className={`text-sm ${styles.empty}`}>{emptyState}</p>
          )}

          {results && results.length > 0 && (
            <div className="space-y-2">
              {results.map((rec) => (
                <div
                  key={rec.id}
                  className={`rounded-lg border bg-white p-3 text-sm ${
                    rec.tier === "recommended" ? "border-green-300" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">
                        {formatVolunteerDisplayName(rec.name)}
                        {rec.tier === "recommended" && (
                          <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">
                            Best match
                          </span>
                        )}
                        {rec.bilingual && (
                          <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-800">
                            Spanish
                          </span>
                        )}
                      </p>
                      <div className="mt-1 text-sm">
                        <ContactPhone
                          phone={rec.phone}
                          allowContact={canWrite}
                          className={
                            canWrite ? "block text-blue-700 hover:underline" : "block text-slate-600"
                          }
                        />
                        <ContactEmail
                          email={rec.email}
                          allowContact={canWrite}
                          className={
                            canWrite ? "block text-blue-700 hover:underline" : "block text-slate-600"
                          }
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canWrite && rec.phone && (
                        <a
                          href={`tel:${rec.phone.replace(/\s/g, "")}`}
                          className="rounded bg-blue-700 px-2 py-1 text-xs font-medium text-white hover:bg-blue-800"
                        >
                          Call
                        </a>
                      )}
                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => assignVolunteer(rec)}
                          className="rounded border border-green-600 px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-50"
                        >
                          Assign to shift
                        </button>
                      )}
                    </div>
                  </div>
                  <ul className="mt-2 list-inside list-disc text-xs text-slate-600">
                    {rec.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
