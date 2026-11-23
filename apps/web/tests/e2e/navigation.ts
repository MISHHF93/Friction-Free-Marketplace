import type { Page } from "@playwright/test";

/** Wait until the route loading shell is gone and a real heading is painted. */
export async function waitForAppReady(page: Page, timeout = 12_000) {
  // waitForFunction(fn, arg, options) — the timeout must be the third argument
  // or this wait inherits the 30s test timeout and burns the whole budget.
  await page.waitForFunction(
    () => {
      if (document.querySelector("[data-ffm-route-loading='true']")) return false;
      return [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].some((element) => {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
        const rect = element.getBoundingClientRect();
        if (rect.width <= 1 || rect.height <= 1) return false;
        const text = (element.textContent ?? "").trim();
        return text.length > 0 && !/^loading\b/i.test(text);
      });
    },
    undefined,
    { timeout }
  );
}

export async function openPath(page: Page, path: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      // "commit" returns once the response is received. Heavy client pages such as
      // /dashboard/listings/create can delay domcontentloaded long enough to
      // look hung on WebKit and iPhone projects; readiness is checked below.
      await page.goto(path, { waitUntil: "commit" });
      await waitForAppReady(page);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      // Retry only transient navigation failures. A readiness timeout should fail
      // once; retrying it for 10s at a time burns the 30s test budget.
      if (!/ERR_ABORTED|ERR_CONNECTION_RESET|frame was detached|interrupted/i.test(message) || attempt === 2) throw error;
      await page.waitForTimeout(400 * (attempt + 1));
    }
  }
  throw lastError;
}
