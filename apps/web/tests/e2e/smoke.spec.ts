import { expect, test } from "@playwright/test";

const routes = [
  { path: "/", heading: /good things find their next person/i },
  { path: "/browse", heading: /find trusted listings/i },
  { path: "/search", heading: /find trusted listings/i },
  { path: "/login", heading: /log in/i },
  { path: "/signup", heading: /create account/i },
  { path: "/privacy", heading: /privacy policy/i },
  { path: "/terms", heading: /terms of service/i },
  { path: "/pricing", heading: /pricing/i },
  { path: "/safety", heading: /safety/i }
];

test.describe("public route smoke", () => {
  for (const route of routes) {
    test(`${route.path} renders`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.ok()).toBeTruthy();
      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
    });
  }

  test("protected dashboard sends visitors to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=/);
    await expect(page.getByRole("heading", { name: /log in/i })).toBeVisible();
  });

  test("desktop header names its primary navigation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Desktop navigation check.");
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  });
});
