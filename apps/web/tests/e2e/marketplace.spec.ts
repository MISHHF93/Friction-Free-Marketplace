import { expect, test } from "@playwright/test";

const browserOrigin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001").origin;

test.describe("marketplace discovery and listing surfaces", () => {
  test("listing search renders filters and active query chips", async ({ page }) => {
    await page.goto("/search?q=camera&category=electronics&minSellerTrust=80");

    await expect(page.getByRole("heading", { name: /find trusted listings faster/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search bikes/i)).toHaveValue("camera");
    await expect(page.getByText("Query: camera")).toBeVisible();
    await expect(page.getByText("Category: Electronics")).toBeVisible();
    await expect(page.getByText("Seller trust: 80+")).toBeVisible();
  });

  test("listing detail exposes favorites and checkout affordances", async ({ page }) => {
    await page.goto("/listings/verified-road-bike");

    await expect(page.getByRole("button", { name: /live favorite|save listing|saved/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /checkout is available on live listings/i })).toBeDisabled();
    await expect(page.getByText(/sign in as a buyer to message this seller/i)).toBeVisible();
  });

  test("unauthenticated favorites API is blocked", async ({ request }) => {
    const response = await request.put("/api/favorites/11111111-1111-4111-8111-111111111111", {
      headers: { Origin: browserOrigin },
    });

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Sign in to manage favorites." });
  });

  test("unauthenticated checkout API is blocked", async ({ request }) => {
    const response = await request.post("/api/stripe/payment-intents", {
      headers: { Origin: browserOrigin },
      data: { listingId: "11111111-1111-4111-8111-111111111111" }
    });

    expect(response.status()).toBe(401);
  });
});
