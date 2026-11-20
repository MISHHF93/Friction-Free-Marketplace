import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { waitForAppReady } from "./navigation";

const publicRoutes = ["/", "/browse", "/search", "/login", "/signup", "/pricing", "/safety", "/privacy", "/terms", "/how-it-works", "/contact"];
const signedInRoutes = ["/dashboard", "/dashboard/listings/create", "/dashboard/messages", "/dashboard/offers", "/dashboard/purchases", "/dashboard/sales", "/account/settings", "/search"];

async function openPath(page: Page, path: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!/ERR_ABORTED|ERR_CONNECTION_RESET|frame was detached|Execution context was destroyed|interrupted/i.test(message) || attempt === 2) {
        throw error;
      }
      await page.waitForTimeout(400 * (attempt + 1));
    }
  }
  throw lastError;
}

async function expectNoSeriousViolations(page: Page) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.waitForLoadState("domcontentloaded");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const serious = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
      expect(serious, JSON.stringify(serious.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.slice(0, 3).map((node) => node.target)
      })), null, 2)).toEqual([]);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!/Execution context was destroyed|Target closed|frame was detached/i.test(message) || attempt === 2) {
        throw error;
      }
      await page.waitForTimeout(400 * (attempt + 1));
      await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    }
  }
  throw lastError;
}

test.describe("accessibility", () => {
  for (const route of publicRoutes) {
    test(`public ${route} has no serious axe violations`, async ({ page }) => {
      await openPath(page, route);
      await expectNoSeriousViolations(page);
    });
  }

  test("signed-in routes have no serious axe violations", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ name: "ffm-e2e-user", value: "alice", url: "http://127.0.0.1:3001" }]);
    const page = await context.newPage();
    for (const route of signedInRoutes) {
      await openPath(page, route);
      await expectNoSeriousViolations(page);
    }
    await context.close();
  });
});
