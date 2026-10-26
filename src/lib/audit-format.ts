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
