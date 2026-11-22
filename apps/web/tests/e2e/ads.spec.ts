import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
const E2E_ADS_COOKIE = "ffm_e2e_ads";

const shotDir = "/workspace/ffm-shots/r11";

async function expectNoSeriousViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .options({ iframes: false })
    .setLegacyMode(true)
    .analyze();
  const serious = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
  expect(serious, JSON.stringify(serious.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.slice(0, 3).map((node) => node.target)
  })), null, 2)).toEqual([]);
}

test.describe("sponsored placements", () => {
  test("an empty slot renders nothing and stays axe-clean", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("[data-ad-slot]")).toHaveCount(0);
    await expect(page.getByText("Sponsored", { exact: true })).toHaveCount(0);
    await expectNoSeriousViolations(page);
    if (testInfo.project.name === "chromium") {
      mkdirSync(shotDir, { recursive: true });
      await page.screenshot({ path: `${shotDir}/ads-empty-desktop.png`, fullPage: true });
    }
  });

  test("an active campaign shows Sponsored on the home slot", async ({ page, context }, testInfo) => {
    await context.addCookies([{
      name: E2E_ADS_COOKIE,
      value: "home_top_banner",
      url: testInfo.project.use.baseURL ?? "http://127.0.0.1:3001"
    }]);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const slot = page.locator('[data-ad-slot="home_top_banner"]');
    await expect(slot).toBeVisible();
    await expect(slot.getByText("Sponsored", { exact: true })).toBeVisible();
    await expectNoSeriousViolations(page);
    mkdirSync(shotDir, { recursive: true });
    const project = testInfo.project.name;
    const file = project === "chromium" ? "ads-sponsored-desktop.png" : `ads-sponsored-${project}.png`;
    await page.screenshot({ path: `${shotDir}/${file}`, fullPage: true });
  });
});
