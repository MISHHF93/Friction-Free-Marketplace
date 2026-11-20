import { expect, test } from "@playwright/test";

test("home page exposes marketplace navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /buy and sell locally with protected payment/i })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /search listings/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Sell", exact: true })).toBeVisible();
});

test("keyboard users can bypass navigation", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("mobile navigation keeps search and primary actions available", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "chromium", "Mobile-only acceptance check.");
  await page.goto("/");

  await expect(page.getByLabel("Search listings")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "App sections" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sell", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
});
