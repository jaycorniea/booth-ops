export type PortalBannerTone = "error" | "warning" | "success" | "info";

export type PortalQueryMessage = {
  message: string;
  tone: PortalBannerTone;
};

/** Redirect targets for `/?error=` (auth, middleware, page guards). */
export const PORTAL_HOME_ERRORS: Record<string, PortalQueryMessage> = {
  readonly: {
    tone: "warning",
    message:
      "View-only sign-in — editing is disabled. Use the Day Captain password to make changes.",
  },
  admin_required: {
    tone: "warning",
    message:
      "That page requires admin access. Sign in with the admin password or ask the coordinator for access.",
  },
  access_required: {
    tone: "warning",
    message: "That page requires Day Captain or admin access.",
  },
};

/** Captain portal window gates — `/?captain_window=a|d` from proxy redirect. */
export const CAPTAIN_WINDOW_MESSAGES: Record<string, PortalQueryMessage> = {
  a: {
    tone: "info",
    message:
      "Captain tools are not open yet. Shift sheets unlock on the captain-tools date in event settings.",
  },
  d: {
    tone: "warning",
    message:
      "Event closed — captain access ended after 9 pm on the last event day. Contact ops@example.org if you need something.",
  },
};

export const PORTAL_FEEDBACK_ERRORS: Record<string, PortalQueryMessage> = {
  closed: {
    tone: "error",
    message: "Feedback is closed — submissions ended one week before the event.",
  },
  comments: {
    tone: "error",
    message: "Please enter your comments before submitting.",
  },
  save: {
    tone: "error",
    message: "Could not save feedback. Try again in a moment.",
  },
  notfound: {
    tone: "error",
    message: "That feedback entry was not found.",
  },
};

export const PORTAL_ISSUE_ERRORS: Record<string, PortalQueryMessage> = {
  closed: {
    tone: "error",
    message: "The issue log is not open yet — it unlocks two days before the event.",
  },
  notfound: {
    tone: "error",
    message: "That issue was not found.",
  },
};

export const PORTAL_JOIN_SHIFT_ERRORS: Record<string, PortalQueryMessage> = {
  password: {
    tone: "error",
    message: "Incorrect signup password. Contact the coordinator for the current password.",
  },
  name: {
    tone: "error",
    message: "Please enter your name.",
  },
  no_shifts: {
    tone: "error",
    message: "All volunteer slots are filled for this day.",
  },
  shifts: {
    tone: "error",
    message: "Please choose at least one available shift.",
  },
};

/** Public `/join-on-call` gate + application form. */
export const PORTAL_JOIN_ON_CALL_ERRORS: Record<string, PortalQueryMessage> = {
  password: {
    tone: "error",
    message: "Incorrect signup password. The password is shown below the field.",
  },
  name: {
    tone: "error",
    message: "Please enter your name.",
  },
};

export const PORTAL_JOIN_SHIFT_DAY_ERRORS: Record<string, PortalQueryMessage> = {
  password: {
    tone: "error",
    message: "Incorrect signup password. Ask your Day Captain for the current password.",
  },
  name: {
    tone: "error",
    message: "Please enter your name.",
  },
  no_shifts: {
    tone: "error",
    message: "All volunteer slots are filled for this day.",
  },
  shifts: {
    tone: "error",
    message: "Please choose at least one available shift.",
  },
};

export const PORTAL_VOLUNTEERS_ERRORS: Record<string, PortalQueryMessage> = {
  on_call_name: {
    tone: "error",
    message: "Could not add to on-call pool — name is required.",
  },
};

export const PORTAL_ON_CALL_ERRORS: Record<string, PortalQueryMessage> = {
  default: {
    tone: "error",
    message: "Could not update that application. It may have already been reviewed.",
  },
};

const DEFAULT_ERROR: PortalQueryMessage = {
  tone: "error",
  message: "Something went wrong. Please try again.",
};

/** Resolve a query-param code against a message map; unknown codes use fallback or generic error. */
export function resolvePortalQueryMessage(
  code: string | undefined,
  map: Record<string, PortalQueryMessage>,
  fallback: PortalQueryMessage = DEFAULT_ERROR
): PortalQueryMessage | null {
  if (!code) return null;
  return map[code] ?? fallback;
}
