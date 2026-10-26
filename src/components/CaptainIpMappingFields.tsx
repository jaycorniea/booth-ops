"use client";

import { DayCaptainSelect } from "@/components/DayCaptainSelect";
import { GUEST_DAY_CAPTAIN_KEY, type DayCaptainOption } from "@/lib/captain-ip-mapping-keys";
import { useState } from "react";

export function CaptainIpMappingFields({
  options,
  defaultCaptainKey,
  defaultGuestName = "",
  selectClassName = "max-w-[11rem] rounded border px-1.5 py-0.5 text-xs",
  guestInputClassName = "w-[8rem] rounded border px-1.5 py-0.5 text-xs",
  groupByDate = false,
}: {
  options: DayCaptainOption[];
  defaultCaptainKey?: string;
  defaultGuestName?: string;
  selectClassName?: string;
  guestInputClassName?: string;
  groupByDate?: boolean;
}) {
  const initialKey = defaultCaptainKey ?? options[0]?.key ?? "";
  const [captainKey, setCaptainKey] = useState(initialKey);
  const showGuestName = captainKey === GUEST_DAY_CAPTAIN_KEY;

  return (
    <>
      <DayCaptainSelect
        options={options}
        defaultValue={initialKey}
        groupByDate={groupByDate}
        className={selectClassName}
        onChange={(value) => setCaptainKey(value)}
      />
      {showGuestName ? (
        <input
          type="text"
          name="guest_name"
          required
          defaultValue={defaultGuestName}
          placeholder="Name"
          aria-label="Device owner name"
          className={guestInputClassName}
        />
      ) : null}
    </>
  );
}
