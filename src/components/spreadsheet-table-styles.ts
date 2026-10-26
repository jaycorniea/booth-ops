/**
 * Day-page spreadsheet column widths (ch), tuned from content metrics.
 * Table is fixed — no horizontal scroll.
 */
export const SPREADSHEET_CELL =
  "border border-slate-200 px-2 py-1 align-top text-xs";
export const SPREADSHEET_HEAD =
  "border border-slate-200 bg-slate-50 px-2 py-1 text-left text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500";
export const SPREADSHEET_INPUT =
  "w-full min-w-0 min-h-9 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 sm:min-h-0 sm:px-1.5 sm:py-0.5";

export const SPREADSHEET_EMAIL_INPUT =
  "w-full min-w-0 min-h-9 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 sm:min-h-0 sm:px-1.5 sm:py-0.5";

/** Let table grow to column mins; parent uses overflow-x-auto. */
export const SPREADSHEET_TABLE = "w-max min-w-full border-collapse text-left";

/** Day page tables fill the card; column widths from content metrics (see file header). */
export const CAPTAIN_SPREADSHEET_TABLE = "w-max max-w-full border-collapse text-left";
export const SHIFT_SPREADSHEET_TABLE = "w-max max-w-full border-collapse text-left";

export const SHIFT_SPREADSHEET_CELL =
  "box-border overflow-hidden border border-slate-200 px-1 py-1 align-top text-xs";
export const SHIFT_SPREADSHEET_HEAD =
  "box-border overflow-hidden border border-slate-200 bg-slate-50 px-1 py-1 text-left text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500";

/** Contact-link icon + gap beside phone/email inputs. */
const CONTACT_LINK = "1.25rem";

export const SHIFT_COL_W_CHECKIN = "w-[2.5rem]";
export const SHIFT_COL_W_NOSHOW = "w-[2.5rem]";
/** Prior 10ch −10% */
export const SHIFT_COL_W_SHIFT = "w-[9ch]";
export const SHIFT_COL_W_NAME = "w-[10ch]";
/** Prior 11ch −10% + contact link */
export const SHIFT_COL_W_PHONE = `w-[calc(10ch+${CONTACT_LINK})]`;
/** Prior 30ch +10% + contact link */
export const SHIFT_COL_W_EMAIL = `w-[calc(33ch+${CONTACT_LINK})]`;
/** Fits uppercase “Reimburse” header + checkbox (was 2rem → clipped to REIM). */
export const SHIFT_COL_W_TICKET = "w-[6.5rem]";
/** Stacked volunteer cell — sized to an email + contact icon, not the card. */
export const SHIFT_COL_W_STACK = "w-[20rem]";

export const SHIFT_COL_SHIFT = "min-w-0";
export const SHIFT_COL_CHECKIN = "min-w-0 px-0.5";
export const SHIFT_COL_NOSHOW = "min-w-0 px-0.5";
export const SHIFT_COL_NAME = "min-w-0";
export const SHIFT_COL_PHONE = "min-w-0";
export const SHIFT_COL_EMAIL = "min-w-0";
export const SHIFT_COL_TICKET_D8 = "min-w-0";
export const SHIFT_COL_STACK = "min-w-0";
export const SHIFT_COL_EXTRA =
  "extra-col extra-cell min-w-0 bg-orange-50/80";
export const SHIFT_COL_HEAD_EXTRA =
  "extra-col extra-head bg-orange-50 text-amber-900";
/** Wrapped header for narrow checkbox columns (Checked In / No Show). */
export const SHIFT_COL_HEAD_CHECKBOX =
  "overflow-visible whitespace-normal break-words px-0.5 text-center !text-center leading-[1.15]";

/** Role label + time range. */
export const CAPTAIN_COL_ROLE = "w-[7.5rem]";
export const CAPTAIN_COL_NAME = "w-[8ch]";
/** Prior 11ch −10% */
export const CAPTAIN_COL_PHONE = "w-[10ch]";
/** Prior 30ch +10% */
export const CAPTAIN_COL_EMAIL = "w-[33ch]";
/** District select label (e.g. District 27). */
export const CAPTAIN_COL_DISTRICT = "w-[12rem]";

export const SPREADSHEET_SELECT =
  "w-full min-w-0 truncate rounded border border-slate-200 py-0.5 pl-1.5 pr-7 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

/** Label above full-width mobile card fields. */
export const MOBILE_FIELD_LABEL =
  "mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500";
