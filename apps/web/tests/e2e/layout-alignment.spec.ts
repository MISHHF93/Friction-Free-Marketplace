import { expect, test } from "@playwright/test";

const publicPages = ["/", "/browse", "/categories", "/pricing", "/safety", "/contact"];

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
]) {
  test.describe(`${viewport.name} layout containment`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const path of publicPages) {
      test(`${path} has no page-level horizontal overflow`, async ({ page }) => {
        await page.goto(path);
        const dimensions = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          page: document.documentElement.scrollWidth,
        }));
        expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
      });
    }
  });
}

test("homepage search suggestions stay inside the search panel", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const search = page.getByRole("search").filter({ has: page.getByLabel("Search marketplace") });
  const panelBox = await search.boundingBox();
  expect(panelBox).not.toBeNull();

  for (const suggestion of await search.getByRole("link").all()) {
    const suggestionBox = await suggestion.boundingBox();
    expect(suggestionBox).not.toBeNull();
    expect(suggestionBox!.x).toBeGreaterThanOrEqual(panelBox!.x);
    expect(suggestionBox!.x + suggestionBox!.width).toBeLessThanOrEqual(panelBox!.x + panelBox!.width + 1);
  }
});
