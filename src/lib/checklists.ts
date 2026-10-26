export const OPENING_CHECKLIST = [
  { key: "open_access", label: "Booth unlocked and ready" },
  { key: "open_signage", label: "Signage visible" },
  { key: "open_brief", label: "First shift briefed" },
] as const;

export const CLOSING_CHECKLIST = [
  { key: "close_portal", label: "Shift sheet updated" },
  { key: "close_secure", label: "Valuables secured" },
  { key: "close_clean", label: "Booth left clean" },
] as const;

export const SCENARIOS = [
  {
    title: "Visitor asks for information",
    action: "Greet them, answer from booth materials, and offer to find a captain if you are unsure.",
    pamphlets: [] as string[],
  },
] as const;
