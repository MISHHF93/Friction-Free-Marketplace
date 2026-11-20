import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const publicRoutes = ["/", "/browse", "/search", "/login", "/signup", "/pricing", "/safety", "/privacy", "/terms", "/how-it-works", "/contact"];
const signedInRoutes = ["/dashboard", "/dashboard/listings/create", "/dashboard/messages", "/dashboard/offers", "/dashboard/purchases", "/dashboard/sales", "/account/settings", "/search"];

async function expectNoSeriousViolations(page: Page) {
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
}

test.describe("accessibility", () => {
  for (const route of publicRoutes) {
    test(`public ${route} has no serious axe violations`, async ({ page }) => {
      await page.goto(route);
      await expectNoSeriousViolations(page);
    });
  }

  test("signed-in routes have no serious axe violations", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ name: "ffm-e2e-user", value: "alice", url: "http://127.0.0.1:3001" }]);
    const page = await context.newPage();
    for (const route of signedInRoutes) {
      await page.goto(route);
      await expectNoSeriousViolations(page);
    }
    await context.close();
  });
});
