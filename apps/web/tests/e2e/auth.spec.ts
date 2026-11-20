import { expect, test } from "@playwright/test";
import { waitForAppReady } from "./navigation";

test.describe("auth pages", () => {
  test("login page renders email/password form and preserves next route", async ({ page }) => {
    await page.goto("/login?next=/dashboard/messages");
    await waitForAppReady(page);

    await expect(page.getByRole("heading", { name: /log in to your account/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.locator("form").filter({ hasText: "Email" }).locator('input[name="next"]')).toHaveValue("/dashboard/messages");
    await expect(page.getByRole("link", { name: /create an account/i })).toBeVisible();
  });

  test("signup page validates the account creation form shape", async ({ page }) => {
    await page.goto("/signup");
    await waitForAppReady(page);

    await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
    await expect(page.getByLabel("Display name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });
});
