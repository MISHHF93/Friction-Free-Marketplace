import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type TestInfo } from "@playwright/test";
import { openPath } from "./navigation";

function screenshotFile(testInfo: TestInfo, name: string) {
  const configured = process.env.PLAYWRIGHT_SCREENSHOT_DIR;
  if (!configured) return testInfo.outputPath(name);
  mkdirSync(configured, { recursive: true });
  return path.join(configured, `${testInfo.project.name}-${name}`);
}

const pages = ["/", "/browse", "/search", "/listings/verified-road-bike", "/login"];

test.describe("phone layout", () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test("shows the app tab bar and does not scroll sideways", async ({ page }) => {
    for (const path of pages) {
      await openPath(page, path);
      await expect(page.getByRole("navigation", { name: "App sections" })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(1);
    }
  });

  test("keeps checkout reachable on a listing", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPath(page, "/");
    await page.screenshot({ path: screenshotFile(testInfo, "mobile-home-390.png"), fullPage: false });
    await openPath(page, "/browse");
    await page.screenshot({ path: screenshotFile(testInfo, "mobile-browse-390.png"), fullPage: false });
    await openPath(page, "/listings/verified-road-bike");
    await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
    await page.screenshot({ path: screenshotFile(testInfo, "mobile-listing-390.png"), fullPage: false });
    await page.getByRole("button", { name: "Buy", exact: true }).click();
    await expect(page.getByRole("button", { name: "Preview test authorization" })).toBeVisible();
    await page.screenshot({ path: screenshotFile(testInfo, "mobile-checkout-390.png"), fullPage: false });
    await page.context().addCookies([{ name: "ffm-e2e-user", value: "alice", url: "http://127.0.0.1:3001" }]);
    await openPath(page, "/dashboard/messages");
    await page.screenshot({ path: screenshotFile(testInfo, "mobile-messages-390.png"), fullPage: false });
    await openPath(page, "/dashboard/purchases");
    await page.screenshot({ path: screenshotFile(testInfo, "mobile-orders-390.png"), fullPage: false });
    await page.context().clearCookies();
    await page.context().addCookies([{ name: "ffm-e2e-user", value: "bob", url: "http://127.0.0.1:3001" }]);
    await openPath(page, "/dashboard/listings/create");
    await expect(page.getByRole("button", { name: "Photos", exact: true })).toBeVisible();
    await page.screenshot({ path: screenshotFile(testInfo, "mobile-sell-390.png"), fullPage: false });
  });
});
