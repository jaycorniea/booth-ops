export const CAPTAIN_FEEDBACK_CATEGORIES = [
  { value: "portal", label: "Portal & Tools" },
  { value: "training", label: "Training & Scenario Prep" },
  { value: "signage_materials", label: "Signage & Booth Materials" },
  { value: "volunteer_coordination", label: "Volunteer Coordination" },
  { value: "spanish_coverage", label: "Spanish-Language Coverage" },
  { value: "general", label: "General / Other" },
] as const;

export function feedbackCategoryLabel(value: string): string {
  return CAPTAIN_FEEDBACK_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function feedbackSubmitterLabel(name: string | null | undefined): string {
  return name?.trim() || "Anonymous";
}