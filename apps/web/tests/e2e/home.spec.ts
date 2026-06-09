import { expect, test } from "@playwright/test";

test("home page exposes marketplace navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /buy and sell locally/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /marketplace search bar/i, includeHidden: true })).toBeAttached();
  await expect(page.getByRole("heading", { name: /fresh inventory/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /take the marketplace with you/i })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /browse listings/i })).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "Sign up" })).toBeVisible();
});
