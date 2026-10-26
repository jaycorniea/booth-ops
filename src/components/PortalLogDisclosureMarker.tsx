export type PortalLogDisclosureGroup = "actor" | "day" | "session";

const GROUP_CLASSES: Record<
  PortalLogDisclosureGroup,
  { marker: string; icon: string }
> = {
  actor: {
    marker:
      "group-open/actor:text-slate-700 group-hover/actor:bg-slate-100 group-hover/actor:text-slate-600",
    icon: "group-open/actor:rotate-90",
  },
  day: {
    marker:
      "group-open/day:text-slate-700 group-hover/day:bg-slate-100 group-hover/day:text-slate-600",
    icon: "group-open/day:rotate-90",
  },
  session: {
    marker:
      "group-open/session:text-slate-700 group-hover/session:bg-slate-100 group-hover/session:text-slate-600",
    icon: "group-open/session:rotate-90",
  },
};

/** Right-pointing triangle for `<details>` rows; rotates down when its named `group` opens. */
export function PortalLogDisclosureMarker({
  groupName,
}: {
  groupName: PortalLogDisclosureGroup;
}) {
  const styles = GROUP_CLASSES[groupName];

  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition ${styles.marker}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 12 12"
        className={`h-3.5 w-3.5 transition-transform duration-150 ${styles.icon}`}
        fill="currentColor"
        aria-hidden
      >
        <path d="M4.5 2.5 9 6 4.5 9.5Z" />
      </svg>
    </span>
  );
}