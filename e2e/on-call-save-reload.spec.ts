import fs from "fs";
import path from "path";
import { expect, test } from "@playwright/test";
import { setPortalAuth } from "./helpers/portal-auth";

const EVENT_DATE_LABEL = "Fri, Aug 14";
const SCRATCH = process.env.PHASE1_SCRATCH;

async function captureScreenshot(page: import("@playwright/test").Page, name: string) {
  if (!SCRATCH) return;
  const dir = path.join(SCRATCH, "phase1-oncall-playwright");
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, name), fullPage: true });
}

test.describe("on-call pool save and reload", () => {
  test("captain can add, edit availability, save, reload, and log contact", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const rawName = `E2E Tester ${stamp}`;
    const email = `oncall-e2e-${stamp}@example.com`;

    await setPortalAuth(context, "captain");
    await page.goto("/on-call");
    await expect(page.getByRole("heading", { name: "On-call volunteer pool" })).toBeVisible();

    const addCard = page.getByRole("heading", { name: "Add volunteer (approved)" }).locator("..");
    await addCard.locator('input[name="name"]').fill(rawName);
    await addCard.locator('input[name="phone"]').fill(`612555${String(stamp).slice(-4)}`);
    await addCard.locator('input[name="email"]').fill(email);

    await addCard.getByLabel(EVENT_DATE_LABEL, { exact: true }).check();
    await addCard.getByLabel(/^4\. 3:00/).check();

    await addCard.getByRole("button", { name: "Add to pool" }).click();

    const volunteerCard = page
      .locator(".rounded-lg.border.border-slate-100")
      .filter({ has: page.locator(`input[name="email"][value="${email}"]`) });
    await expect(volunteerCard).toBeVisible({ timeout: 15_000 });
    await expect(volunteerCard).toContainText(EVENT_DATE_LABEL);
    await expect(volunteerCard).toContainText("3:00–5:00");

    const anyFairDayEdit = volunteerCard.getByLabel(/^Any day$/i);
    await expect(anyFairDayEdit).not.toBeChecked();
    await expect(volunteerCard.getByLabel(EVENT_DATE_LABEL, { exact: true })).toBeChecked();

    await volunteerCard.locator('input[name="notice_minutes"]').fill("35");
    await volunteerCard.locator('input[name="availability"]').fill(`e2e note ${stamp}`);
    await volunteerCard.getByLabel(/^5\. 5:00/).check();
    const saveResponse = page.waitForResponse(
      (resp) => resp.url().includes("/on-call") && resp.request().method() === "POST",
      { timeout: 15_000 }
    );
    await volunteerCard.getByRole("button", { name: "Save" }).click();
    await saveResponse;

    await page.reload({ waitUntil: "networkidle" });
    const reloaded = page
      .locator(".rounded-lg.border.border-slate-100")
      .filter({ has: page.locator(`input[name="email"][value="${email}"]`) });
    await expect(reloaded).toBeVisible({ timeout: 15_000 });
    await expect(reloaded.locator('input[name="notice_minutes"]')).toHaveValue("35");
    await expect(reloaded.locator('input[name="availability"]')).toHaveValue(`e2e note ${stamp}`);
    await expect(reloaded.getByLabel(EVENT_DATE_LABEL, { exact: true })).toBeChecked();
    await expect(reloaded.getByLabel(/^4\. 3:00/)).toBeChecked();
    await expect(reloaded.getByLabel(/^5\. 5:00/)).toBeChecked();
    await expect(reloaded.getByLabel(/^Any day$/i)).not.toBeChecked();

    await reloaded.locator('select[name="eventDate"]').selectOption({ label: EVENT_DATE_LABEL });
    await reloaded.locator('select[name="shiftNum"]').selectOption({ label: "4. 3:00–5:00" });
    const logResponse = page.waitForResponse(
      (resp) => resp.url().includes("/on-call") && resp.request().method() === "POST",
      { timeout: 15_000 }
    );
    await reloaded.getByRole("button", { name: "Log contact" }).click();
    await logResponse;
    await page.reload({ waitUntil: "networkidle" });
    const afterContact = page
      .locator(".rounded-lg.border.border-slate-100")
      .filter({ has: page.locator(`input[name="email"][value="${email}"]`) });
    await expect(afterContact.getByText("Shift requested", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(afterContact.getByText(/contacted/i).first()).toBeVisible();
    await expect(
      afterContact.getByRole("listitem").filter({ hasText: /Thu, Aug 27 · 3:00–5:00 · contacted/i })
    ).toBeVisible();
    await captureScreenshot(page, "after-contact.png");

    const removeResponse = page.waitForResponse(
      (resp) => resp.url().includes("/on-call") && resp.request().method() === "POST",
      { timeout: 15_000 }
    );
    await afterContact.getByRole("button", { name: "Remove" }).click();
    await removeResponse;
    await page.reload({ waitUntil: "networkidle" });
    await expect(
      page.locator(".rounded-lg.border.border-slate-100").filter({
        has: page.locator(`input[name="email"][value="${email}"]`),
      })
    ).toHaveCount(0);
  });
});