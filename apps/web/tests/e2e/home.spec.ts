import { expect, test } from "@playwright/test";

test("home page exposes marketplace navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /browse/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
});
