import { expect, test } from "@playwright/test";

test.describe("marketplace assistant experience", () => {
  test("is not launched from the site header", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /open marketplace assistant/i })).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "Marketplace copilot" })).toHaveCount(0);
  });
});
