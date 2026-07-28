import { expect, test } from "@playwright/test";

const viewports = [
  { name: "phone", width: 320, height: 720 },
  { name: "tablet", width: 768, height: 900 },
  { name: "desktop", width: 1280, height: 900 },
  { name: "wide desktop", width: 1920, height: 1080 },
];

for (const viewport of viewports) {
  test(`header has one clear navigation hierarchy at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    const header = page.getByRole("banner");
    await expect(header.getByRole("button", { name: "Open marketplace AI assistant" })).toHaveCount(1);
    await expect(header.locator('[aria-label="Search trusted marketplace listings"]:visible')).toHaveCount(1);
    await expect(header.locator('[aria-label="Open categories menu"]:visible')).toHaveCount(1);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
