/** Shared availability parse/encode helpers for on-call and interested volunteer forms. */

export function splitAvailability(value: string): string[] {
  if (!value || value.toLowerCase() === "any") return ["any"];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function availabilitySelectionFromStorage(value: string, anyValue = "any"): string[] {
  const parsed = splitAvailability(value);
  const specifics = parsed.filter((entry) => entry !== anyValue);
  if (parsed.includes(anyValue) && specifics.length === 0) return [anyValue];
  if (specifics.length > 0) return specifics;
  return [anyValue];
}

export function mergeAvailabilityToggle(
  current: Iterable<string>,
  value: string,
  anyValue = "any"
): Set<string> {
  if (value === anyValue) return new Set([anyValue]);
  const next = new Set(current);
  next.delete(anyValue);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  if (next.size === 0) return new Set([anyValue]);
  return next;
}

export function encodeAvailabilityFormValues(values: string[], anyValue = "any"): string {
  const specifics = values.filter((entry) => entry !== anyValue);
  if (values.includes(anyValue) && specifics.length === 0) return anyValue;
  if (specifics.length > 0) return specifics.join(",");
  return anyValue;
}