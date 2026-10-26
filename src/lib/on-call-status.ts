export type OnCallVolunteerStatus =
  | "new"
  | "approved"
  | "shift_requested"
  | "shift_assigned"
  | "withdrawn";

export const ON_CALL_STATUS_LABELS: Record<OnCallVolunteerStatus, string> = {
  new: "New application",
  approved: "Approved",
  shift_requested: "Shift requested",
  shift_assigned: "Shift assigned",
  withdrawn: "Withdrawn",
};

/** One-line legend copy for the on-call pool page. */
export const ON_CALL_STATUS_DESCRIPTIONS: Record<OnCallVolunteerStatus, string> = {
  new: "Volunteer signed up at /join-on-call; awaiting PI approval.",
  approved: "In the backup pool — available when a scheduled volunteer no-shows (T+15).",
  shift_requested:
    "Day Captain contacted them about covering one or more shifts. Multiple pending outreach requests are allowed. The name is easy to misread: the captain requested a shift of them, not the other way around.",
  shift_assigned: "Accepted and placed on a shift roster slot (Volunteer 1 or 2).",
  withdrawn: "Removed or rejected — no longer in the active pool.",
};

/** Statuses eligible for on-call matching and Day Captain outreach. */
export const ON_CALL_ACTIVE_STATUSES: OnCallVolunteerStatus[] = ["approved", "shift_requested"];

/** Active pool volunteers counted toward backup depth (approved + outreach in progress). */
export const ON_CALL_COVERAGE_STATUSES: OnCallVolunteerStatus[] = ["approved", "shift_requested"];

export function isOnCallVolunteerStatus(value: string): value is OnCallVolunteerStatus {
  return value in ON_CALL_STATUS_LABELS;
}

export function onCallStatusBadgeClass(status: OnCallVolunteerStatus): string {
  switch (status) {
    case "new":
      return "bg-amber-100 text-amber-900";
    case "approved":
      return "bg-blue-100 text-blue-800";
    case "shift_requested":
      return "bg-violet-100 text-violet-800";
    case "shift_assigned":
      return "bg-green-100 text-green-800";
    case "withdrawn":
      return "bg-slate-100 text-slate-600";
  }
}