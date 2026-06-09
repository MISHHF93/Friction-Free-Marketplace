import { expect, test } from "@playwright/test";

test.describe("auth pages", () => {
  test("login page renders email/password form and preserves next route", async ({ page }) => {
    await page.goto("/login?next=/dashboard/messages");

    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.locator('input[name="next"]')).toHaveValue("/dashboard/messages");
    await expect(page.getByRole("link", { name: /create an account/i })).toBeVisible();
  });

  test("signup page validates the account creation form shape", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
    await expect(page.getByLabel("Display name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });
});
