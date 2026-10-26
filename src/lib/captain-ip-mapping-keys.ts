import type { CaptainSlot } from "./day-captain-slots";
import { getBoothConfig } from "./booth-config";

/** Legacy single-admin key — prefer per-admin keys from {@link encodeAdminCaptainKey}. */
export const ADMIN_DAY_CAPTAIN_KEY = "admin";
export const ADMIN_DAY_CAPTAIN_KEY_PREFIX = "admin:";
export const ADMIN_IP_NOTES_SUFFIX = " (admin)";

/** Portal admins — shared login; assign per device on Captain IPs. */
export function portalAdminNames(): string[] {
  return [getBoothConfig().org.contactName, "Admin"];
}

export const PORTAL_ADMIN_NAMES = portalAdminNames();

export const GUEST_DAY_CAPTAIN_KEY = "guest";
export const GUEST_IP_NOTES_PREFIX = "visitor:";

export interface DayCaptainOption {
  key: string;
  event_date: string;
  captain_slot: CaptainSlot;
  captain_name: string;
  label: string;
}

export function encodeAdminCaptainKey(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${ADMIN_DAY_CAPTAIN_KEY_PREFIX}${slug}`;
}

export function isAdminCaptainKey(key: string): boolean {
  const trimmed = key.trim();
  return trimmed === ADMIN_DAY_CAPTAIN_KEY || trimmed.startsWith(ADMIN_DAY_CAPTAIN_KEY_PREFIX);
}

export function adminCaptainIpNotes(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  return `${trimmed}${ADMIN_IP_NOTES_SUFFIX}`;
}

export function isAdminIdentifiedMapping(row: { notes: string }): boolean {
  const notes = row.notes.trim();
  return notes.endsWith(ADMIN_IP_NOTES_SUFFIX) && notes.length > ADMIN_IP_NOTES_SUFFIX.length;
}

export function adminDisplayNameFromNotes(notes: string): string {
  const trimmed = notes.trim();
  if (!isAdminIdentifiedMapping({ notes: trimmed })) return trimmed;
  return trimmed.slice(0, -ADMIN_IP_NOTES_SUFFIX.length).trim();
}

export function guestIpNotes(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  return `${GUEST_IP_NOTES_PREFIX}${trimmed}`;
}

export function isGuestIdentifiedMapping(row: { notes: string }): boolean {
  return row.notes.trimStart().startsWith(GUEST_IP_NOTES_PREFIX);
}

export function guestDisplayNameFromNotes(notes: string): string {
  const trimmed = notes.trim();
  if (!trimmed.startsWith(GUEST_IP_NOTES_PREFIX)) return trimmed;
  return trimmed.slice(GUEST_IP_NOTES_PREFIX.length).trim();
}

export function adminDayCaptainOptions(): DayCaptainOption[] {
  return PORTAL_ADMIN_NAMES.map((name) => ({
    key: encodeAdminCaptainKey(name),
    event_date: "",
    captain_slot: "full",
    captain_name: name,
    label: `Admin — ${name}`,
  }));
}

/** @deprecated Use {@link adminDayCaptainOptions} — first admin. */
export function adminDayCaptainOption(): DayCaptainOption {
  return adminDayCaptainOptions()[0]!;
}

export function guestDayCaptainOption(): DayCaptainOption {
  return {
    key: GUEST_DAY_CAPTAIN_KEY,
    event_date: "",
    captain_slot: "full",
    captain_name: "",
    label: "Other — name this device",
  };
}
