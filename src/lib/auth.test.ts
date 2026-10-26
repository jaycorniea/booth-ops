import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AUTH_SESSION_MAX_AGE_SECONDS,
  getAdminPassword,
  getDayCaptainPassword,
  getReadOnlyPassword,
  getVolunteerPortalPassword,
  homePathForRole,
  verifyPassword,
} from "./auth";

const ENV_KEYS = [
  "DAY_CAPTAIN_PASSWORD",
  "ADMIN_PASSWORD",
  "READ_ONLY_PASSWORD",
  "VOLUNTEER_PORTAL_PASSWORD",
] as const;

describe("auth passwords", () => {
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("expires auth sessions after 24 hours", () => {
    expect(AUTH_SESSION_MAX_AGE_SECONDS).toBe(60 * 60 * 24);
  });

  it("has no built-in default passwords", () => {
    expect(getDayCaptainPassword()).toBe("");
    expect(getAdminPassword()).toBe("");
    expect(getReadOnlyPassword()).toBe("");
    expect(getVolunteerPortalPassword()).toBe("");
    expect(verifyPassword("admin-demo")).toBeNull();
  });

  it("reads env vars", () => {
    process.env.DAY_CAPTAIN_PASSWORD = "captain-demo";
    process.env.ADMIN_PASSWORD = "admin-demo";
    process.env.READ_ONLY_PASSWORD = "viewer-demo";
    process.env.VOLUNTEER_PORTAL_PASSWORD = "volunteer-demo";

    expect(getDayCaptainPassword()).toBe("captain-demo");
    expect(getAdminPassword()).toBe("admin-demo");
    expect(verifyPassword("admin-demo")).toBe("admin");
    expect(verifyPassword("captain-demo")).toBe("captain");
    expect(getVolunteerPortalPassword()).toBe("volunteer-demo");
  });

  it("routes volunteers and viewers to /volunteer", () => {
    expect(homePathForRole("volunteer")).toBe("/volunteer");
    expect(homePathForRole("viewer")).toBe("/volunteer");
    expect(homePathForRole("captain")).toBe("/");
    expect(homePathForRole("admin")).toBe("/");
  });
});
