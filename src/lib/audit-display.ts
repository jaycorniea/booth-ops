import type { AuthRole } from "./auth-types";
import { ROLE_LABELS } from "./auth-types";

export {
  formatAuditChangeSummary,
  formatAuditEntityType,
  formatFieldChange,
  parseAuditChanges,
  type FieldChange,
} from "./audit-format";

export function formatAuditActorLine(params: {
  actorRole: AuthRole | string;
  captainName?: string | null;
}): { primary: string; secondary?: string } {
  const roleLabel = ROLE_LABELS[params.actorRole as AuthRole] ?? params.actorRole;
  if (params.captainName?.trim()) {
    return {
      primary: params.captainName.trim(),
      secondary: roleLabel,
    };
  }
  return { primary: roleLabel };
}
