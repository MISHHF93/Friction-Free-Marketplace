import { expect, test } from "@playwright/test";

test("two signed-in users see only their own profile", async ({ browser }) => {
  const baseURL = "http://127.0.0.1:3001";
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  await aliceContext.addCookies([{ name: "ffm-e2e-user", value: "alice", url: baseURL }]);
  await bobContext.addCookies([{ name: "ffm-e2e-user", value: "bob", url: baseURL }]);

  const alicePage = await aliceContext.newPage();
  const bobPage = await bobContext.newPage();
  await alicePage.goto("/dashboard");
  await bobPage.goto("/dashboard");

  await expect(alicePage.getByRole("heading", { name: /Alice Buyer's overview/i })).toBeVisible();
  await expect(bobPage.getByRole("heading", { name: /Bob Seller's overview/i })).toBeVisible();
  await expect(alicePage.getByText("Bob Seller")).toHaveCount(0);
  await expect(bobPage.getByText("Alice Buyer")).toHaveCount(0);
  await expect(alicePage.getByText("alice@example.com").first()).toBeVisible();
  await expect(bobPage.getByText("bob@example.com").first()).toBeVisible();

  await aliceContext.close();
  await bobContext.close();
});
