import { expect, test } from "@playwright/test";
import { setPortalAuth } from "./helpers/portal-auth";

test.describe("shift signup portal bypass", () => {
  test("logged-in captain skips password gate", async ({ page, context }) => {
    await setPortalAuth(context, "captain");
    await page.goto("/join-shift");
    await expect(page.getByRole("button", { name: "Submit application" })).toBeVisible();
    await expect(page.locator('input[name="signup_password"]')).not.toBeVisible();
  });

  test("logged-in admin skips password gate on per-day signup", async ({ page, context }) => {
    await setPortalAuth(context, "admin");
    await page.goto("/join-shift/2026-08-27");
    await expect(page.getByRole("button", { name: "Submit application" })).toBeVisible();
    await expect(page.locator('input[name="signup_password"]')).not.toBeVisible();
  });

  test("portal password unlocks shift signup without login", async ({ page }) => {
    await page.goto("/join-shift");
    await page.locator('input[name="signup_password"]').fill("captain2026");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("button", { name: "Submit application" })).toBeVisible();
    await expect(page.locator('input[name="signup_password"]')).not.toBeVisible();
  });
});