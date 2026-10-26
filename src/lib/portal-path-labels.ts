import { formatEventDate, formatScheduleDayTitle } from "./event-dates";

const STATIC_PATH_LABELS: Record<string, string> = {
  "/": "Home",
  "/schedule": "Schedule",
  "/volunteers": "Volunteer profiles",
  "/access": "Access",
  "/guidance/volunteer": "Booth guidance",
  "/orientation/volunteer-guidance": "Booth guidance",
  "/kpi": "KPIs",
  "/event-settings": "Event settings",
  "/login": "Login",
  "/volunteer": "Volunteer hub",
  "/more": "More",
  "/more/add-volunteer": "Add a volunteer",
  "/day-log": "Day log",
};

const DAY_SUBPAGE_LABELS: Record<string, string> = {
  eod: "EOD report",
  /** Legacy path — redirects to day dashboard. */
  roster: "Day (legacy roster)",
};

/** Human label for a portal route path. */
export function formatPortalPath(path: string | null | undefined): string {
  if (!path?.trim()) return "—";

  const normalized = path.split("?")[0]?.split("#")[0] ?? path;
  if (STATIC_PATH_LABELS[normalized]) return STATIC_PATH_LABELS[normalized];

  const dayMatch = /^\/day\/(\d{4}-\d{2}-\d{2})(?:\/([^/]+))?$/.exec(normalized);
  if (dayMatch) {
    const [, iso, sub] = dayMatch;
    const dayTitle = formatScheduleDayTitle(iso);
    if (!sub) return `Day · ${dayTitle}`;
    const subLabel = DAY_SUBPAGE_LABELS[sub] ?? sub;
    return `${subLabel} · ${formatEventDate(iso)}`;
  }

  const orientationMatch = /^\/orientation\/([^/]+)$/.exec(normalized);
  if (orientationMatch) {
    return `Orientation · ${orientationMatch[1]}`;
  }

  return normalized;
}

/** Compact breadcrumb from navigation events (oldest first, consecutive duplicates collapsed). */
export function buildSessionJourney(
  events: { path: string | null }[],
  maxStops = 5
): { breadcrumb: string; stops: string[]; truncated: boolean } {
  const stops: string[] = [];
  for (const event of events) {
    const label = formatPortalPath(event.path);
    if (label === "—") continue;
    if (stops[stops.length - 1] === label) continue;
    stops.push(label);
  }

  if (stops.length <= maxStops) {
    return { breadcrumb: stops.join(" → ") || "—", stops, truncated: false };
  }

  const head = stops.slice(0, maxStops - 1);
  const tail = stops[stops.length - 1]!;
  return {
    breadcrumb: `${head.join(" → ")} → … → ${tail}`,
    stops,
    truncated: true,
  };
}