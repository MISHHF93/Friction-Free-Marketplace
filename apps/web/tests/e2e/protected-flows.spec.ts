import { expect, test } from "@playwright/test";

const protectedRedirectCases = [
  { path: "/dashboard/listings/create", label: "listing creation" },
  { path: "/dashboard/messages", label: "chat" },
  { path: "/dashboard/offers", label: "offers" },
  { path: "/dashboard/payments", label: "checkout and payments" },
  { path: "/admin", label: "admin permissions" }
];

test.describe("protected flows", () => {
  for (const { path, label } of protectedRedirectCases) {
    test(`redirects unauthenticated ${label} access to login`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`));
      await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
    });
  }

  test("admin route keeps requested destination in the login next parameter", async ({ page }) => {
    await page.goto("/admin/users");

    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fusers/);
  });
});
