import type { Page } from "@playwright/test";

/**
 * Playwright waits for document.fonts.ready before capturing. Opening
 * checkout loads Stripe.js, which requests fonts that CSP font-src does
 * not allow, so that promise can hang. Skip Playwright's font wait
 * instead of loosening CSP or raising the test timeout.
 */
export async function screenshotPage(page: Page, options: { path: string; fullPage?: boolean }) {
  process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";
  await page.screenshot({ ...options, timeout: 8_000 });
}
