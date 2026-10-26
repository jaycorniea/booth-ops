import type { CoverageMetric } from "./kpi";
import { listVolunteerProfiles, type VolunteerProfile } from "./volunteer-profiles";

export interface DataHygieneKpis {
  totalVolunteers: number;
  phone: CoverageMetric;
  email: CoverageMetric;
  reachable: CoverageMetric;
  complete: CoverageMetric;
}

function percent(filled: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((filled / total) * 1000) / 10;
}

function coverage(filled: number, total: number, label: string, detail?: string): CoverageMetric {
  return { filled, total, percent: percent(filled, total), label, detail };
}

export function hasContactPhone(profile: Pick<VolunteerProfile, "phone">): boolean {
  return profile.phone.trim().length > 0;
}

export function hasContactEmail(profile: Pick<VolunteerProfile, "email">): boolean {
  return profile.email.trim().length > 0;
}

export function hasReachableContact(
  profile: Pick<VolunteerProfile, "phone" | "email">
): boolean {
  return hasContactPhone(profile) || hasContactEmail(profile);
}

export function hasCompleteContact(
  profile: Pick<VolunteerProfile, "phone" | "email">
): boolean {
  return hasContactPhone(profile) && hasContactEmail(profile);
}

type ContactProfile = Pick<VolunteerProfile, "phone" | "email" | "roles">;

/** Active booth volunteers — deduped profiles with at least one role. */
export function activeVolunteerProfiles(profiles: ContactProfile[]): ContactProfile[] {
  return profiles.filter((profile) => profile.roles.length > 0);
}

export function summarizeVolunteerContactHygiene(profiles: ContactProfile[]): DataHygieneKpis {
  const active = activeVolunteerProfiles(profiles);
  const total = active.length;
  const withPhone = active.filter(hasContactPhone).length;
  const withEmail = active.filter(hasContactEmail).length;
  const reachable = active.filter(hasReachableContact).length;
  const complete = active.filter(hasCompleteContact).length;
  const countLabel = `${total} unique volunteer profile${total === 1 ? "" : "s"}`;

  return {
    totalVolunteers: total,
    phone: coverage(
      withPhone,
      total,
      "Volunteers with phone",
      `${withPhone} of ${countLabel}`
    ),
    email: coverage(
      withEmail,
      total,
      "Volunteers with email",
      `${withEmail} of ${countLabel}`
    ),
    reachable: coverage(
      reachable,
      total,
      "Volunteers reachable",
      `${reachable} with phone or email · ${total - reachable} missing both`
    ),
    complete: coverage(
      complete,
      total,
      "Complete contact info",
      `${complete} with phone and email`
    ),
  };
}

export async function getDataHygieneKpis(): Promise<DataHygieneKpis> {
  const profiles = await listVolunteerProfiles();
  return summarizeVolunteerContactHygiene(profiles);
}