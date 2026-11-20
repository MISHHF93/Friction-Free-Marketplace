import { expect, test } from "@playwright/test";

const pages = ["/", "/search", "/listings/verified-road-bike", "/login"];

test.describe("phone layout", () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test("shows the app tab bar and does not scroll sideways", async ({ page }) => {
    for (const path of pages) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("navigation", { name: "App sections" })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(1);
    }
  });

  test("keeps checkout reachable on a listing", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.screenshot({ path: "/opt/cursor/artifacts/mobile-home-390.png", fullPage: false });
    await page.goto("/listings/verified-road-bike");
    await expect(page.getByRole("button", { name: "Preview test authorization" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/mobile-listing-390.png", fullPage: false });
    await page.locator("#protected-checkout").scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/opt/cursor/artifacts/mobile-checkout-390.png", fullPage: false });
    await page.context().addCookies([{ name: "ffm-e2e-user", value: "alice", url: "http://127.0.0.1:3001" }]);
    await page.goto("/dashboard/messages");
    await page.screenshot({ path: "/opt/cursor/artifacts/mobile-messages-390.png", fullPage: false });
  });
});
