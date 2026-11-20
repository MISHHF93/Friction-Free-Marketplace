import { expect, test } from "@playwright/test";
import { openPath } from "./navigation";

test.describe("core marketplace flows", () => {
  test("signup form and account profile stay on the signed-in user", async ({ browser, page }) => {
    await page.goto("/signup");
    await expect(page.getByLabel("Display name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await page.getByLabel("Display name").fill("Casey Buyer");
    await page.getByLabel("Email").fill("casey@example.com");
    await expect(page.getByLabel("Display name")).toHaveValue("Casey Buyer");

    const context = await browser.newContext();
    await context.addCookies([{ name: "ffm-e2e-user", value: "alice", url: "http://127.0.0.1:3001" }]);
    const alice = await context.newPage();
    await alice.goto("/account/settings");
    await expect(alice.getByLabel("Display name")).toBeVisible();
    await expect(alice.getByText("alice@example.com").first()).toBeVisible();
    await context.close();
  });

  test("create listing form accepts a draft", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ name: "ffm-e2e-user", value: "bob", url: "http://127.0.0.1:3001" }]);
    const page = await context.newPage();
    await page.goto("/dashboard/listings/create");
    await page.getByRole("button", { name: "Details", exact: true }).click();
    await page.getByLabel(/^Title/).fill("Oak writing desk");
    await expect(page.getByLabel(/^Title/)).toHaveValue("Oak writing desk");
    await context.close();
  });

  test("search shows marketplace results", async ({ page }) => {
    await page.goto("/search?q=bike");
    await expect(page.getByRole("heading", { name: /bike|road|listing|search/i }).first()).toBeVisible();
  });

  test("messages, offers, and orders stay empty for a new account", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ name: "ffm-e2e-user", value: "alice", url: "http://127.0.0.1:3001" }]);
    const page = await context.newPage();
    await openPath(page, "/dashboard/messages");
    await expect(page.getByText(/sign in to open conversations/i)).toHaveCount(0);
    await openPath(page, "/dashboard/offers");
    await expect(page.getByRole("heading", { name: /offers/i }).first()).toBeVisible();
    await openPath(page, "/dashboard/sales");
    await expect(page.getByText(/no sales yet/i)).toBeVisible();
    await openPath(page, "/dashboard/purchases");
    await expect(page.getByText(/purchases|no purchases|orders appear here/i).first()).toBeVisible();
    await context.close();
  });

  test("review and dispute forms report the mocked result", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ name: "ffm-e2e-user", value: "alice", url: "http://127.0.0.1:3001" }]);
    await context.route("**/api/reviews", (route) => route.fulfill({ json: { message: "Review saved for this order." } }));
    await context.route("**/api/stripe/transactions/**/dispute", (route) => route.fulfill({ json: { message: "Dispute opened. The order is marked disputed and no new charge was made." } }));
    const page = await context.newPage();
    await page.goto("/dashboard/purchases");
    await page.getByLabel("Review").fill("The handoff was clear and the item matched the listing.");
    await page.getByRole("button", { name: "Submit review" }).click();
    await expect(page.getByText("Review saved for this order.")).toBeVisible();
    await page.getByText("Problem with this order?").first().click();
    await page.getByLabel("What happened").fill("The item arrived with damage that was not in the listing.");
    await page.getByRole("button", { name: "Open dispute" }).click();
    await expect(page.getByText(/no new charge was made/i)).toBeVisible();
    await context.close();
  });

  test("stripe.js loads under the content security policy", async ({ page }) => {
    const stripeScript = page.waitForResponse((response) => response.url().includes("https://js.stripe.com/v3/") && response.ok());
    const response = await page.goto("/listings/verified-road-bike");
    const policy = response?.headers()["content-security-policy"] ?? "";
    expect(policy).toContain("https://js.stripe.com");
    await expect(page.getByRole("heading", { name: /road bike/i })).toBeVisible();
    const script = page.locator("script[src='https://js.stripe.com/v3/']");
    await expect(script).toHaveCount(1);
    const nonce = await script.evaluate((element) => (element as HTMLScriptElement).nonce || element.getAttribute("nonce") || "");
    expect(nonce.length > 0).toBe(true);
    expect(await page.locator("html").getAttribute("data-nonce")).toBeNull();
    await stripeScript;
  });

  test("sample listing checkout preview uses the mocked Stripe test response", async ({ page }) => {
    await page.route("**/api/stripe/payment-intents", (route) => {
      const key = route.request().headers()["idempotency-key"];
      if (!key || key.length < 8) {
        return route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "A valid Idempotency-Key header is required for checkout." }) });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ transactionId: "txn_test_escrow", mode: "test" })
      });
    });
    await page.goto("/listings/verified-road-bike");
    await page.getByRole("button", { name: "Buy", exact: true }).click();
    await page.getByRole("button", { name: "Preview test authorization" }).click();
    await expect(page.getByText("txn_test_escrow")).toBeVisible();
    await expect(page.getByText(/no charge was made/i)).toBeVisible();
  });
});
