"use client";

import { clearPortalAlertsAction } from "@/lib/actions/alerts";

export function ResetAlertsButton() {
  return (
    <form
      action={clearPortalAlertsAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Delete all alerts? Portal log and activity history are not affected."
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Clear alerts
      </button>
    </form>
  );
}