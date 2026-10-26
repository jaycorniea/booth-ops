"use client";

import { FeedbackResponseButton } from "@/components/FeedbackResponseButton";
import { Btn, Label, Textarea } from "@/components/ui";
import { formatPortalTimestampCompact } from "@/lib/portal-time";
import { useState } from "react";

export type PiAdminResponseEntry = {
  admin_response: string;
  admin_response_at: string | null;
};

export function PiAdminResponsePanel({
  entry,
  isAdmin,
  action,
  placeholder,
  compactDisplay = false,
  adminFormCollapsed = false,
}: {
  entry: PiAdminResponseEntry;
  isAdmin: boolean;
  action: (formData: FormData) => void | Promise<void>;
  placeholder: string;
  /** Lighter PI inset without uppercase heading. */
  compactDisplay?: boolean;
  /** Admin reply form hidden until Reply / Edit (feedback page). */
  adminFormCollapsed?: boolean;
}) {
  const hasResponse = Boolean(entry.admin_response?.trim());
  const [showAdminForm, setShowAdminForm] = useState(
    isAdmin && !adminFormCollapsed && !hasResponse
  );

  if (!hasResponse && !isAdmin) {
    return null;
  }

  const showForm = isAdmin && (!adminFormCollapsed || showAdminForm);

  return (
    <div className={`${compactDisplay ? "mt-2" : "mt-3 border-t border-slate-200 pt-3"}`}>
      {hasResponse && (
        <div
          className={
            compactDisplay
              ? "rounded border border-blue-100 bg-blue-50/80 px-2 py-1.5 text-sm text-slate-800"
              : "rounded-md border border-blue-100 bg-blue-50/90 px-3 py-2"
          }
        >
          {!compactDisplay && (
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">PI response</p>
          )}
          <p className={`whitespace-pre-wrap ${compactDisplay ? "" : "mt-1 text-sm text-slate-800"}`}>
            {entry.admin_response}
          </p>
          {entry.admin_response_at && (
            <p className={`text-xs text-slate-500 ${compactDisplay ? "mt-1" : "mt-1.5"}`}>
              {formatPortalTimestampCompact(entry.admin_response_at)}
            </p>
          )}
        </div>
      )}

      {isAdmin && adminFormCollapsed && !showForm && (
        <Btn
          type="button"
          variant="secondary"
          className="mt-2 text-xs"
          onClick={() => setShowAdminForm(true)}
        >
          {hasResponse ? "Edit reply" : "Reply"}
        </Btn>
      )}

      {showForm && (
        <form action={action} className={`space-y-2 ${hasResponse || adminFormCollapsed ? "mt-2" : ""}`}>
          {!compactDisplay && (
            <Label>{hasResponse ? "Edit PI response" : "PI response (admin)"}</Label>
          )}
          <Textarea
            name="admin_response"
            defaultValue={entry.admin_response ?? ""}
            placeholder={placeholder}
            rows={compactDisplay ? 2 : 3}
          />
          <div className="flex flex-wrap gap-2">
            <FeedbackResponseButton hasExisting={hasResponse} />
            {adminFormCollapsed && (
              <Btn type="button" variant="secondary" className="text-sm" onClick={() => setShowAdminForm(false)}>
                Cancel
              </Btn>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
