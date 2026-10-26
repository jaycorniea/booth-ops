export type AuthRole = "captain" | "admin" | "viewer" | "volunteer";

export const ROLE_LABELS: Record<AuthRole, string> = {
  captain: "Day Captain",
  viewer: "Read-Only",
  admin: "Admin",
  volunteer: "Volunteer",
};