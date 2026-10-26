import type { AuthRole } from "./auth-types";

/** Normalize volunteer names for display and storage — keep full name, collapse whitespace. */
export function formatVolunteerDisplayName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

/** First name plus last-name initial (e.g. Patricia Smith → Patricia S.). */
export function formatVolunteerLastInitial(name: string): string {
  const normalized = formatVolunteerDisplayName(name).replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (!normalized) return "";
  const parts = normalized.split(" ");
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(" ");
  return `${first} ${last.charAt(0).toUpperCase()}.`;
}

export function showsFullScheduleLastName(role: AuthRole): boolean {
  return role === "admin" || role === "captain";
}

/** Schedule roster names: full last name for captains/admin; last initial for others. */
export function formatSchedulePersonName(name: string, role: AuthRole): string {
  if (showsFullScheduleLastName(role)) return formatVolunteerDisplayName(name);
  return formatVolunteerLastInitial(name);
}
