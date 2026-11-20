import type { Page } from "@playwright/test";

export async function openPath(page: Page, path: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.locator("[data-ffm-route-loading='true']").waitFor({ state: "detached", timeout: 10_000 }).catch(() => undefined);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!/ERR_ABORTED|ERR_CONNECTION_RESET|frame was detached/i.test(message) || attempt === 2) throw error;
      await page.waitForTimeout(400 * (attempt + 1));
    }
  }
  throw lastError;
}
