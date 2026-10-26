/** Schedule roster tables — fixed columns so days align vertically. */
export const SCHEDULE_TABLE = "w-full table-fixed border-collapse text-left text-xs";

export const SCHEDULE_HEAD =
  "border-b border-slate-200 bg-white py-1 pr-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500";

export const SCHEDULE_CELL =
  "box-border min-w-0 overflow-hidden border-b border-slate-100 py-1 pr-2 align-top";

export const SCHEDULE_COL_SHIFT = "w-[7rem]";
export const SCHEDULE_COL_VOL = "min-w-0";

export function ScheduleTableColGroup() {
  return (
    <colgroup>
      <col className={SCHEDULE_COL_SHIFT} />
      <col className={SCHEDULE_COL_VOL} />
      <col className={SCHEDULE_COL_VOL} />
      <col className={SCHEDULE_COL_VOL} />
      <col className={SCHEDULE_COL_VOL} />
    </colgroup>
  );
}
