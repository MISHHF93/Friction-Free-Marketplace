import { expect, test } from "@playwright/test";

test.describe("money actions", () => {
  test("buyer can confirm release and delivery from the order", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ name: "ffm-e2e-user", value: "alice", url: "http://127.0.0.1:3001" }]);
    await context.route("**/api/stripe/transactions/**/release", (route) => route.fulfill({ json: { status: "completed" } }));
    await context.route("**/api/stripe/transactions/**/delivered", (route) => route.fulfill({ json: { status: "delivered" } }));
    const page = await context.newPage();
    await page.goto("/dashboard/purchases");
    await page.getByRole("button", { name: "Release funds" }).click();
    await page.getByRole("button", { name: "Confirm release" }).click();
    await expect(page.getByText("Release submitted.")).toBeVisible();
    await context.close();
  });

  test("seller confirms shipment with carrier and tracking", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ name: "ffm-e2e-user", value: "bob", url: "http://127.0.0.1:3001" }]);
    await context.route("**/api/stripe/transactions/**/ship", (route) => route.fulfill({ json: { status: "shipped" } }));
    await context.route("**/api/stripe/transactions/**/refund", (route) => route.fulfill({ json: { status: "refunded" } }));
    const page = await context.newPage();
    await page.goto("/dashboard/sales");
    await page.getByRole("button", { name: "Ship" }).click();
    await page.getByLabel("Carrier").fill("UPS");
    await page.getByLabel("Tracking number").fill("1Z999");
    await page.getByRole("button", { name: "Confirm shipment" }).click();
    await expect(page.getByText("Ship submitted.")).toBeVisible();
    await page.getByRole("button", { name: "Refund buyer" }).click();
    await page.getByRole("button", { name: "Confirm refund" }).click();
    await expect(page.getByText("Refund submitted.")).toBeVisible();
    await context.close();
  });

  test("admin dispute routes require a signed-in admin", async ({ request }) => {
    const response = await request.post("/api/admin/disputes", {
      data: { action: "close", target_id: "11111111-1111-4111-8111-111111111111", reason: "Split the held funds", outcome: "split" }
    });
    expect(response.status()).toBeGreaterThanOrEqual(401);
    expect(response.status()).toBeLessThan(500);
  });
});
