"use client";

import { setPortalWindowSimAction } from "@/lib/actions/auth";
import type { PortalWindow } from "@/lib/portal-windows";
import { PORTAL_WINDOW_META } from "@/lib/portal-windows";

const WINDOWS: PortalWindow[] = ["a", "b", "c", "d"];

export function AdminPortalWindowSwitcher({
  current,
}: {
  current: PortalWindow | null;
}) {
  const simActive = current !== null;

  return (
    <div
      className="relative z-10 mt-1.5 flex flex-wrap items-center gap-1"
      role="group"
      aria-label="Simulate portal window"
    >
      <span className="text-[10px] font-medium text-blue-100/90">Window</span>
      {WINDOWS.map((window) => {
        const active = current === window;
        return (
          <form key={window} action={setPortalWindowSimAction.bind(null, window)}>
            <button
              type="submit"
              title={PORTAL_WINDOW_META[window].label}
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 transition ${
                active
                  ? "bg-white text-slate-900 ring-white"
                  : "bg-white/10 text-white ring-white/25 hover:bg-white/20"
              }`}
            >
              {PORTAL_WINDOW_META[window].code}
            </button>
          </form>
        );
      })}
      {simActive ? (
        <form action={setPortalWindowSimAction.bind(null, null)}>
          <button
            type="submit"
            title="Clear simulation — use live calendar window"
            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-blue-100 ring-1 ring-white/25 transition hover:bg-white/15"
          >
            Live
          </button>
        </form>
      ) : null}
    </div>
  );
}
