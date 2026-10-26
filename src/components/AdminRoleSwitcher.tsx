import { ActiveRoleBadge } from "@/components/role-indicator";
import { switchAuthRoleAction } from "@/lib/actions/auth";
import { ROLE_LABELS, type AuthRole } from "@/lib/auth-types";

const VIEW_AS_ROLES: AuthRole[] = ["captain", "admin", "viewer", "volunteer"];

export function AdminRoleSwitcher({ currentRole }: { currentRole: AuthRole }) {
  const otherRoles = VIEW_AS_ROLES.filter((role) => role !== currentRole);
  const viewingAsAdmin = currentRole === "admin";

  return (
    <div className="flex flex-col items-end gap-1.5">
      {viewingAsAdmin ? (
        <>
          <span className="text-xs font-bold uppercase tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
            Viewing as
          </span>
          <ActiveRoleBadge role={currentRole} prominent />
        </>
      ) : (
        <ActiveRoleBadge role={currentRole} />
      )}
      <div className="flex flex-wrap items-center justify-end gap-1" role="group" aria-label="Switch role">
        <span className="text-[10px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
          Switch:
        </span>
        {otherRoles.map((role) => (
          <form key={role} action={switchAuthRoleAction.bind(null, role)}>
            <button
              type="submit"
              className="rounded-md bg-slate-950/45 px-2 py-0.5 text-[11px] font-medium text-white ring-1 ring-white/35 backdrop-blur-sm transition hover:bg-slate-950/65"
            >
              {ROLE_LABELS[role]}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
