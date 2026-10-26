import { expect, test } from "@playwright/test";

test("health endpoint reports ok and database", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(body.database).toBe(true);
  expect(body.version).toBeTruthy();
  expect(["turso", "file"]).toContain(body.storage);
});