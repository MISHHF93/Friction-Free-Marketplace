import { expect, test } from "@playwright/test";

const routes = [
  { path: "/", heading: /buy and sell locally with protected payment/i },
  { path: "/browse", heading: /search listings/i },
  { path: "/search", heading: /search listings/i },
  { path: "/login", heading: /log in to your account/i },
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

  test("adapts cleanly between phone and wide desktop viewports", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "App sections" })).toBeVisible();
    const mobileWidth = await page.locator(".app-shell").evaluate((element) => element.getBoundingClientRect().width);
    expect(mobileWidth).toBeLessThanOrEqual(390);

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.getByRole("navigation", { name: "App sections" })).toBeVisible();
    const desktopWidth = await page.locator(".app-shell").evaluate((element) => element.getBoundingClientRect().width);
    expect(desktopWidth).toBeGreaterThan(480);
  });
});
