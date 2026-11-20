import { expect, test } from "@playwright/test";

const routes = ["/", "/browse", "/search", "/login", "/signup", "/pricing", "/safety"];

test.describe("responsive layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const route of routes) {
    test(`${route} does not overflow a phone viewport`, async ({ page }) => {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});
