"use client";

import { DayCaptainAutosaveRow } from "@/components/DayCaptainAutosaveRow";
import {
  CAPTAIN_COL_DISTRICT,
  CAPTAIN_COL_EMAIL,
  CAPTAIN_COL_NAME,
  CAPTAIN_COL_PHONE,
  CAPTAIN_COL_ROLE,
  CAPTAIN_SPREADSHEET_TABLE,
  MOBILE_FIELD_LABEL,
  SPREADSHEET_CELL,
  SPREADSHEET_HEAD,
} from "@/components/spreadsheet-table-styles";
import { formatRegionLabel } from "@/lib/region-label";
import type { CaptainSlotConfig } from "@/lib/day-captain-slots";
import type { DayCaptainRow } from "@/lib/db";
import { hasVolunteer, UNASSIGNED_SLOT_TEXT_CLASS } from "@/lib/event-dates";
import { formatPhoneDisplay, phoneTelHref } from "@/lib/phone-format";
import { formatVolunteerDisplayName } from "@/lib/volunteer-display-name";

function contactLink(
  value: string | null | undefined,
  kind: "phone" | "email",
  allowContact: boolean
) {
  const text = value?.trim();
  if (!text) return <span className="text-slate-400">—</span>;
  const display = kind === "phone" ? formatPhoneDisplay(text) : text;
  if (!allowContact) {
    return (
      <span className="block break-words text-slate-800" title={display}>
        {display}
      </span>
    );
  }
  const href = kind === "phone" ? phoneTelHref(text) : `mailto:${text}`;
  return (
    <a href={href} className="block break-words text-blue-700 hover:underline" title={display}>
      {display}
    </a>
  );
}

function CaptainColumnGroup() {
  return (
    <colgroup>
      <col className={CAPTAIN_COL_ROLE} />
      <col className={CAPTAIN_COL_NAME} />
      <col className={CAPTAIN_COL_PHONE} />
      <col className={CAPTAIN_COL_EMAIL} />
      <col className={CAPTAIN_COL_DISTRICT} />
    </colgroup>
  );
}

function SpreadsheetHeader() {
  return (
    <thead>
      <tr>
        <th className={`${SPREADSHEET_HEAD} ${CAPTAIN_COL_ROLE}`}>Role</th>
        <th className={`${SPREADSHEET_HEAD} ${CAPTAIN_COL_NAME}`}>Name</th>
        <th className={`${SPREADSHEET_HEAD} ${CAPTAIN_COL_PHONE}`}>Phone</th>
        <th className={`${SPREADSHEET_HEAD} ${CAPTAIN_COL_EMAIL}`}>Email</th>
        <th className={`${SPREADSHEET_HEAD} ${CAPTAIN_COL_DISTRICT}`}>District</th>
      </tr>
    </thead>
  );
}

function DayCaptainReadCard({
  cfg,
  captain,
  contact,
}: {
  cfg: CaptainSlotConfig;
  captain?: DayCaptainRow;
  contact: boolean;
}) {
  const open = !hasVolunteer(captain?.name);
  const displayName = open ? "Open" : formatVolunteerDisplayName(captain?.name ?? "");

  return (
    <div className="rounded border border-slate-200 px-3 py-2 hover:bg-slate-50/60">
      <div className="mb-2">
        <span className="block font-medium text-slate-800">{cfg.label}</span>
        <span className="text-[0.65rem] text-slate-500">{cfg.timeRange}</span>
      </div>
      <div className="space-y-2">
        <div>
          <span className={MOBILE_FIELD_LABEL}>Name</span>
          <p className={`text-sm ${open ? UNASSIGNED_SLOT_TEXT_CLASS : "font-medium text-slate-900"}`}>
            {displayName}
          </p>
        </div>
        <div>
          <span className={MOBILE_FIELD_LABEL}>Phone</span>
          <p className="text-sm">{contactLink(captain?.phone, "phone", contact)}</p>
        </div>
        <div>
          <span className={MOBILE_FIELD_LABEL}>Email</span>
          <p className="text-sm break-all">{contactLink(captain?.email, "email", contact)}</p>
        </div>
        <div>
          <span className={MOBILE_FIELD_LABEL}>District</span>
          <p className="text-sm text-slate-800">{formatRegionLabel(captain?.district) || "—"}</p>
        </div>
      </div>
    </div>
  );
}

function DayCaptainSpreadsheetReadRow({
  cfg,
  captain,
  contact,
}: {
  cfg: CaptainSlotConfig;
  captain?: DayCaptainRow;
  contact: boolean;
}) {
  const open = !hasVolunteer(captain?.name);

  return (
    <tr className="hover:bg-slate-50/60">
      <td className={`${SPREADSHEET_CELL} ${CAPTAIN_COL_ROLE} font-medium text-slate-800`}>
        <span className="block">{cfg.label}</span>
        <span className="text-[0.65rem] font-normal text-slate-500">{cfg.timeRange}</span>
      </td>
      <td className={`${SPREADSHEET_CELL} ${CAPTAIN_COL_NAME}`}>
        <span className={open ? UNASSIGNED_SLOT_TEXT_CLASS : "font-medium text-slate-900"}>
          {open ? "Open" : formatVolunteerDisplayName(captain?.name ?? "")}
        </span>
      </td>
      <td className={`${SPREADSHEET_CELL} ${CAPTAIN_COL_PHONE} whitespace-nowrap`}>
        {contactLink(captain?.phone, "phone", contact)}
      </td>
      <td className={`${SPREADSHEET_CELL} ${CAPTAIN_COL_EMAIL}`}>
        {contactLink(captain?.email, "email", contact)}
      </td>
      <td className={`${SPREADSHEET_CELL} ${CAPTAIN_COL_DISTRICT}`}>
        {formatRegionLabel(captain?.district) || "—"}
      </td>
    </tr>
  );
}

export function DayCaptainSpreadsheetTable({
  slots,
  captains,
  eventDate,
  write,
  contact,
}: {
  slots: CaptainSlotConfig[];
  captains: DayCaptainRow[];
  eventDate: string;
  write: boolean;
  contact: boolean;
}) {
  const mobileCards = (
    <div className="space-y-2 md:hidden">
      {slots.map((cfg) =>
        write ? (
          <DayCaptainAutosaveRow
            key={cfg.slot}
            cfg={cfg}
            captain={captains.find((c) => c.captain_slot === cfg.slot)}
            eventDate={eventDate}
            layout="card"
          />
        ) : (
          <DayCaptainReadCard
            key={cfg.slot}
            cfg={cfg}
            captain={captains.find((c) => c.captain_slot === cfg.slot)}
            contact={contact}
          />
        )
      )}
    </div>
  );

  const desktopTable = (
    <div className="hidden overflow-hidden rounded border border-slate-200 md:block">
      <table className={CAPTAIN_SPREADSHEET_TABLE}>
        <CaptainColumnGroup />
        <SpreadsheetHeader />
        <tbody>
          {slots.map((cfg) =>
            write ? (
              <DayCaptainAutosaveRow
                key={cfg.slot}
                cfg={cfg}
                captain={captains.find((c) => c.captain_slot === cfg.slot)}
                eventDate={eventDate}
              />
            ) : (
              <DayCaptainSpreadsheetReadRow
                key={cfg.slot}
                cfg={cfg}
                captain={captains.find((c) => c.captain_slot === cfg.slot)}
                contact={contact}
              />
            )
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      {mobileCards}
      {desktopTable}
    </>
  );
}
