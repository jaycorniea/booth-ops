/** Pure audit formatting helpers — safe for client components. */

export interface FieldChange {
  from?: unknown;
  to?: unknown;
}

export function parseAuditChanges(raw: string): Record<string, FieldChange> {
  try {
    return JSON.parse(raw) as Record<string, FieldChange>;
  } catch {
    return {};
  }
}

export function formatFieldChange(change: FieldChange): string {
  const hasFrom = change.from !== undefined && change.from !== "";
  const hasTo = change.to !== undefined && change.to !== "";
  if (hasFrom && hasTo) return `${String(change.from)} → ${String(change.to)}`;
  if (hasTo) return `→ ${String(change.to)}`;
  if (hasFrom) return `${String(change.from)} → (removed)`;
  return "—";
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  shift: "Shift",
  on_call: "On-call volunteer",
  interested_volunteer: "Interested volunteer",

  day_captain: "Day Captain",
  tally: "Tally",
  eod_report: "EOD report",
  captain_feedback: "Captain feedback",
  issue: "Issue",
  checklist: "Checklist",
};

export function formatAuditEntityType(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] ?? entityType.replace(/_/g, " ");
}

export function formatAuditChangeSummary(
  changes: Record<string, FieldChange>,
  maxFields = 3
): string {
  const rows = Object.entries(changes);
  if (!rows.length) return "";
  const parts = rows.slice(0, maxFields).map(([field, change]) => {
    return `${field}: ${formatFieldChange(change)}`;
  });
  if (rows.length > maxFields) {
    parts.push(`+${rows.length - maxFields} more`);
  }
  return parts.join("; ");
}
