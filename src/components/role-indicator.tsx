import { ROLE_LABELS, type AuthRole } from "@/lib/auth-types";

/** Solid pill — admin header only. */
export const ROLE_PILL_CLASS: Record<AuthRole, string> = {
  captain: "bg-blue-600 text-white ring-2 ring-blue-300/90 shadow-lg shadow-blue-950/30",
  viewer: "bg-amber-500 text-white ring-2 ring-amber-200/90 shadow-lg shadow-amber-950/30",
  admin: "bg-emerald-600 text-white ring-2 ring-emerald-300/90 shadow-lg shadow-emerald-950/30",
  volunteer: "bg-violet-600 text-white ring-2 ring-violet-300/90 shadow-lg shadow-violet-950/30",
};

/** Subtle chip — captain and read-only headers. */
export const ROLE_BADGE_SUBTLE: Record<AuthRole, string> = {
  captain: "bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/30",
  viewer: "bg-amber-500/20 text-amber-100 ring-1 ring-amber-300/30",
  admin: "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-300/30",
  volunteer: "bg-violet-500/20 text-violet-100 ring-1 ring-violet-300/30",
};

export const ROLE_ACCENT_BAR_CLASS: Record<AuthRole, string> = {
  captain: "bg-blue-500",
  viewer: "bg-amber-400",
  admin: "bg-emerald-500",
  volunteer: "bg-violet-500",
};

export function ActiveRoleBadge({
  role,
  prominent = false,
}: {
  role: AuthRole;
  prominent?: boolean;
}) {
  if (prominent) {
    return (
      <span
        className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2 text-base font-bold shadow-xl ${ROLE_PILL_CLASS[role]}`}
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white" aria-hidden="true" />
        {ROLE_LABELS[role]}
      </span>
    );
  }

  return (
    <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${ROLE_BADGE_SUBTLE[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}
