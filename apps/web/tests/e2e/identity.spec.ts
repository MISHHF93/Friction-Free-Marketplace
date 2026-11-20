import { expect, test, type Page } from "@playwright/test";

async function openPath(page: Page, path: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: "domcontentloaded" });
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

test("two signed-in users see only their own profile", async ({ browser }) => {
  const baseURL = "http://127.0.0.1:3001";
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  await aliceContext.addCookies([{ name: "ffm-e2e-user", value: "alice", url: baseURL }]);
  await bobContext.addCookies([{ name: "ffm-e2e-user", value: "bob", url: baseURL }]);

  const alicePage = await aliceContext.newPage();
  const bobPage = await bobContext.newPage();
  await openPath(alicePage, "/dashboard");
  await openPath(bobPage, "/dashboard");

  await expect(alicePage.getByRole("heading", { name: /Alice Buyer's overview/i })).toBeVisible();
  await expect(bobPage.getByRole("heading", { name: /Bob Seller's overview/i })).toBeVisible();
  await expect(alicePage.getByText("Bob Seller")).toHaveCount(0);
  await expect(bobPage.getByText("Alice Buyer")).toHaveCount(0);
  await expect(alicePage.getByText("alice@example.com").first()).toBeVisible();
  await expect(bobPage.getByText("bob@example.com").first()).toBeVisible();

  await expect(alicePage.getByRole("banner").getByText("Alice Buyer")).toBeVisible();
  await expect(bobPage.getByRole("banner").getByText("Bob Seller")).toBeVisible();

  await openPath(alicePage, "/account/settings");
  await expect(alicePage.getByText("alice@example.com").first()).toBeVisible();
  await expect(alicePage.getByText("bob@example.com")).toHaveCount(0);
  await openPath(bobPage, "/dashboard/messages");
  await expect(bobPage.getByText("Alice Buyer")).toHaveCount(0);
  await openPath(alicePage, "/dashboard/purchases");
  await expect(alicePage.getByRole("heading", { name: "Purchases", exact: true })).toBeVisible();
  await expect(alicePage.getByText("Bob Seller")).toHaveCount(0);
  await openPath(bobPage, "/dashboard/purchases");
  await expect(bobPage.getByText("Alice Buyer")).toHaveCount(0);

  await aliceContext.clearCookies();
  await aliceContext.addCookies([{ name: "ffm-e2e-user", value: "bob", url: baseURL }]);
  await openPath(alicePage, "/dashboard");
  await expect(alicePage.getByRole("heading", { name: /Bob Seller's overview/i })).toBeVisible();
  await expect(alicePage.getByText("alice@example.com")).toHaveCount(0);
  await expect(alicePage.getByText("Alice Buyer")).toHaveCount(0);
  await expect(alicePage.getByRole("banner").getByText("Bob Seller")).toBeVisible();
  await openPath(alicePage, "/account/settings");
  await expect(alicePage.getByText("bob@example.com").first()).toBeVisible();
  await openPath(alicePage, "/dashboard/messages");
  await expect(alicePage.getByText("Alice Buyer")).toHaveCount(0);
  await openPath(alicePage, "/dashboard/sales");
  await expect(alicePage.getByRole("heading", { name: "Sales", exact: true })).toBeVisible();
  await expect(alicePage.getByText("alice@example.com")).toHaveCount(0);

  await aliceContext.close();
  await bobContext.close();
});
