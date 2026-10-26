import { expect, test, type Locator, type Page } from "@playwright/test";
import { setPortalAuth } from "./helpers/portal-auth";

const EVENT_DAY = "2026-08-14";
const FULL_SHIFT = "5";
const PARTIAL_SHIFT = "6";

async function saveVolunteerRow(page: Page, row: Locator) {
  const saveResponse = page.waitForResponse(
    (resp) => resp.request().method() === "POST",
    { timeout: 15_000 }
  );
  await page.getByRole("heading", { name: /Volunteer shift sheet/i }).click();
  await saveResponse;
  await expect(row.getByText("✓ Saved")).toBeVisible({ timeout: 15_000 });
}

async function clearShiftVolunteerSlots(page: Page, shiftNums: string[]) {
  for (const shiftNum of shiftNums) {
    const row = page.locator(`[data-shift-num="${shiftNum}"]`);
    if ((await row.count()) === 0) continue;
    await row.getByLabel("Volunteer 1 name").fill("");
    await row.getByLabel("Volunteer 2 name").fill("");
    await saveVolunteerRow(page, row);
  }
}

test.describe("day dashboard volunteer entry", () => {
  test.afterEach(async ({ page, context }) => {
    await setPortalAuth(context, "captain");
    await page.goto(`/day/${EVENT_DAY}`);
    await clearShiftVolunteerSlots(page, [FULL_SHIFT, PARTIAL_SHIFT]);
  });

  test("captain sees edit forms on every shift with two volunteer fields each", async ({
    page,
    context,
  }) => {
    await setPortalAuth(context, "captain");
    await page.goto(`/day/${EVENT_DAY}`);

    await expect(page.getByRole("heading", { name: /Volunteer shift sheet/i })).toBeVisible();
    await expect(
      page.getByText(/shifts have volunteers assigned.*Changes save when you leave a row/)
    ).toBeVisible();

    const shiftRows = page.locator("[data-shift-num]");
    await expect(shiftRows).toHaveCount(6);
    await expect(page.getByRole("button", { name: "Save shift" })).toHaveCount(0);

    for (let i = 0; i < 6; i++) {
      const row = shiftRows.nth(i);
      await expect(row.getByLabel("Volunteer 1 name")).toHaveCount(1);
      await expect(row.getByLabel("Volunteer 2 name")).toHaveCount(1);
      await expect(row.getByLabel("Volunteer 1 name")).toBeVisible();
      await expect(row.getByLabel("Volunteer 2 name")).toBeVisible();
    }
  });

  test("write mode does not duplicate read-only open-slot badges above edit fields", async ({
    page,
    context,
  }) => {
    await setPortalAuth(context, "captain");
    await page.goto(`/day/${EVENT_DAY}`);

    const shiftRows = page.locator("[data-shift-num]");
    const count = await shiftRows.count();
    for (let i = 0; i < count; i++) {
      await expect(shiftRows.nth(i).getByText("Vol 1 open")).not.toBeVisible();
      await expect(shiftRows.nth(i).getByText("Vol 2 open")).not.toBeVisible();
    }
  });

  test("saved volunteers reload into pre-populated edit boxes", async ({ page, context }) => {
    const stamp = Date.now();
    const vol1Raw = `E2E Alpha ${stamp}`;
    const vol2Raw = `E2E Beta ${stamp}`;

    await setPortalAuth(context, "captain");
    await page.goto(`/day/${EVENT_DAY}`);

    const row = page.locator(`[data-shift-num="${FULL_SHIFT}"]`);
    await row.getByLabel("Volunteer 1 name").fill(vol1Raw);
    await row.getByLabel("Volunteer 2 name").fill(vol2Raw);
    await saveVolunteerRow(page, row);

    await expect(row.getByLabel("Volunteer 1 name")).toHaveValue("E2E 1.", {
      timeout: 15_000,
    });
    await expect(row.getByLabel("Volunteer 2 name")).toHaveValue("E2E 1.");
  });

  test("partial save pre-populates assigned slot while leaving the other editable", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const vol1Raw = `E2E Gamma ${stamp}`;

    await setPortalAuth(context, "captain");
    await page.goto(`/day/${EVENT_DAY}`);

    const row = page.locator(`[data-shift-num="${PARTIAL_SHIFT}"]`);
    await row.getByLabel("Volunteer 1 name").fill(vol1Raw);
    await row.getByLabel("Volunteer 2 name").fill("");
    await saveVolunteerRow(page, row);

    await expect(row.getByLabel("Volunteer 1 name")).toHaveValue("E2E 1.", {
      timeout: 15_000,
    });
    await expect(row.getByLabel("Volunteer 2 name")).toHaveValue("");
    await expect(row.getByLabel("Volunteer 2 name")).toBeVisible();
  });

  test("admin sees full roster edit forms", async ({ page, context }) => {
    await setPortalAuth(context, "admin");
    await page.goto(`/day/${EVENT_DAY}/roster`);

    await expect(page.getByRole("heading", { name: /Roster/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save shift" }).first()).toBeVisible();
    await expect(page.getByText("Volunteer 1").first()).toBeVisible();
    await expect(page.getByText("Checked in").first()).toBeVisible();
  });

  test("viewer sees read-only volunteer cards without edit forms", async ({ page, context }) => {
    await setPortalAuth(context, "viewer");
    await page.goto(`/day/${EVENT_DAY}`);

    await expect(page.getByRole("heading", { name: /Today's volunteers/i })).toBeVisible();
    await expect(page.getByText("edit volunteers below")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Save shift" })).toHaveCount(0);
    await expect(page.getByLabel("Volunteer 1 name")).toHaveCount(0);
  });
});
