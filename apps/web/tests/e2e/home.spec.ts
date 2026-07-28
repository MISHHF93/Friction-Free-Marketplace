import { expect, test } from "@playwright/test";

test("home page exposes marketplace navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /good things find their next person/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /browse like a person, not a database/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /fresh finds, clearly presented/i })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /browse marketplace/i }).first()).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: /sell/i })).toBeVisible();
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

  await expect(page.getByLabel("Search trusted marketplace listings")).toBeVisible();
  await expect(page.getByRole("button", { name: /open mobile navigation/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sell", exact: true })).toBeVisible();
});
