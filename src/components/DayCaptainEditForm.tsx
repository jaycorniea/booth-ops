"use client";

import { Btn, Input } from "@/components/ui";
import type { DayCaptainRow } from "@/lib/db";
import { useActionState } from "react";

export type DayCaptainSaveState =
  | { ok: true; district: string }
  | { ok: false; error: string }
  | null;

export function DayCaptainEditForm({
  captain,
  label,
  saveAction,
  pendingLabel,
}: {
  captain?: DayCaptainRow;
  label: string;
  saveAction: (prev: DayCaptainSaveState, formData: FormData) => Promise<DayCaptainSaveState>;
  pendingLabel: string;
}) {
  const [state, formAction, pending] = useActionState(saveAction, null);
  return (
    <form action={formAction} className="space-y-3 no-print">
      <Input
        name="name"
        defaultValue={captain?.name ?? ""}
        placeholder="Day Captain name"
      />
      <Input
        name="phone"
        defaultValue={captain?.phone ?? ""}
        placeholder="Phone"
        type="tel"
      />
      <Input
        name="email"
        defaultValue={captain?.email ?? ""}
        placeholder="Email"
        type="email"
      />
      <Btn type="submit" disabled={pending}>
        {pending ? pendingLabel : `Save ${label}`}
      </Btn>
      {state?.ok ? (
        <p className="text-sm text-green-700" role="status">
          Saved
        </p>
      ) : null}
      {state && !state.ok ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}