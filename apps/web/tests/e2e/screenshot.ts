import type { Page } from "@playwright/test";

/**
 * Playwright waits for document.fonts.ready before capturing. Opening
 * checkout loads Stripe.js, which requests fonts that CSP font-src does
 * not allow, so that promise can hang. Cap the wait instead of loosening CSP.
 */
export async function screenshotPage(page: Page, options: { path: string; fullPage?: boolean }) {
  await page.evaluate(async () => {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => window.setTimeout(resolve, 1000))
    ]);
  });
  await page.screenshot({ ...options, timeout: 8_000 });
}
