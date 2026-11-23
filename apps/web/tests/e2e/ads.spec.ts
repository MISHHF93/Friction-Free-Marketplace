import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, readFileSync } from "node:fs";
const E2E_ADS_COOKIE = "ffm_e2e_ads";

const shotDir = "/workspace/ffm-shots/r11";

async function expectNoSeriousViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .options({ iframes: false })
    .setLegacyMode(true)
    .analyze();
  const serious = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
  expect(serious, JSON.stringify(serious.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.slice(0, 3).map((node) => node.target)
  })), null, 2)).toEqual([]);
}

test.describe("sponsored placements", () => {
  test("an empty slot renders nothing and stays axe-clean", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("[data-ad-slot]")).toHaveCount(0);
    await expect(page.getByText("Sponsored", { exact: true })).toHaveCount(0);
    await expectNoSeriousViolations(page);
    if (testInfo.project.name === "chromium") {
      mkdirSync(shotDir, { recursive: true });
      await page.screenshot({ path: `${shotDir}/ads-empty-desktop.png`, fullPage: true });
    }
  });

  test("an active campaign shows Sponsored on the home slot", async ({ page, context }, testInfo) => {
    await context.addCookies([{
      name: E2E_ADS_COOKIE,
      value: "home_top_banner",
      url: testInfo.project.use.baseURL ?? "http://127.0.0.1:3001"
    }]);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const slot = page.locator('[data-ad-slot="home_top_banner"]');
    await expect(slot).toBeVisible();
    await expect(slot.getByText("Sponsored", { exact: true })).toBeVisible();
    await expectNoSeriousViolations(page);
    mkdirSync(shotDir, { recursive: true });
    const project = testInfo.project.name;
    const file = project === "chromium" ? "ads-sponsored-desktop.png" : `ads-sponsored-${project}.png`;
    await page.screenshot({ path: `${shotDir}/${file}`, fullPage: true });
  });
});

const r12ShotDir = "/workspace/ffm-shots/r12";
const ALICE_ID = "11111111-1111-4111-8111-111111111111";
// Playwright runs from apps/web (testDir is relative to it).
const PNG = readFileSync("public/icon-1024.png");

function r12Shot(testInfo: import("@playwright/test").TestInfo, name: string) {
  mkdirSync(r12ShotDir, { recursive: true });
  const project = testInfo.project.name;
  return `${r12ShotDir}/${name}-${project}.png`;
}

test.describe("self-serve advertising", () => {
  test("signed-out visitors are asked to sign in before buying an ad", async ({ page }) => {
    await page.goto("/advertise", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: /local buyers/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in to advertise" })).toHaveAttribute("href", "/login?next=/advertise");
  });

  test("an advertiser fills the form, pays through stubbed Stripe Checkout, and sees My ads", async ({ page, context }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL ?? "http://127.0.0.1:3001";
    await context.addCookies([{ name: "ffm-e2e-user", value: "alice", url: baseURL }]);
    let checkoutBody: Record<string, unknown> | null = null;
    await context.route("**/api/uploads/advertiser-creative", (route) => route.fulfill({
      json: { path: `advertisers/${ALICE_ID}/e2e.png`, publicUrl: "/icon-1024.png" }
    }));
    await context.route("**/api/ads/checkout", (route) => {
      const key = route.request().headers()["idempotency-key"];
      if (!key || key.length < 8) {
        return route.fulfill({ status: 400, json: { error: "A valid Idempotency-Key header is required." } });
      }
      checkoutBody = route.request().postDataJSON();
      // Stand-in for the Stripe-hosted page: Stripe redirects to success_url after payment.
      return route.fulfill({ json: { url: "/dashboard/ads?checkout=success&ad=00000000-0000-4000-8000-0000000ad102", campaignId: "00000000-0000-4000-8000-0000000ad102" } });
    });
    await page.goto("/advertise", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: /local buyers/i })).toBeVisible();
    // Interact only after React has hydrated the form, or the file input has no change handler yet.
    await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

    await page.getByLabel(/Search inline/).check();
    await page.getByLabel("Ad image").setInputFiles({ name: "banner.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByRole("img", { name: "Ad image preview" })).toBeVisible();
    await page.getByLabel("Headline").fill("Bike tune-up special");
    await page.getByLabel("Business or display name").fill("Alice's Bikes");
    await page.getByLabel("Link (https)").fill("http://bikes.example.com");
    await page.getByLabel("Run length").selectOption("7");
    await expect(page.getByText("Total: $105.00")).toBeVisible();
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await expect(page.getByText(/link must be a full https:\/\/ address/)).toBeVisible();
    await page.getByLabel("Link (https)").fill("https://bikes.example.com/tune");
    await expectNoSeriousViolations(page);
    await page.screenshot({ path: r12Shot(testInfo, "advertise-form"), fullPage: true });

    await page.getByRole("button", { name: "Continue to payment" }).click();
    await expect(page.getByRole("heading", { name: "Review and pay" })).toBeVisible();
    await expect(page.getByTestId("ad-total")).toHaveText("$105.00");
    await expect(page.getByText("Sponsored", { exact: true })).toBeVisible();
    await expectNoSeriousViolations(page);
    await page.screenshot({ path: r12Shot(testInfo, "advertise-payment-step"), fullPage: true });

    await page.getByRole("button", { name: "Pay $105.00 with Stripe" }).click();
    await page.waitForURL(/\/dashboard\/ads\?checkout=success/);
    expect(checkoutBody).toMatchObject({ placement: "search_inline", runDays: 7, targetUrl: "https://bikes.example.com/tune", imagePath: `advertisers/${ALICE_ID}/e2e.png` });
    expect(checkoutBody).not.toHaveProperty("price");
    await expect(page.getByRole("status").filter({ hasText: "Payment received" })).toBeVisible();
    await expect(page.locator('[data-ad-row="paid_pending_review"]')).toContainText("Paid. In review");
    await expect(page.locator('[data-ad-row="active"]')).toContainText("1,840 impressions");
    await expect(page.locator('[data-ad-row="rejected"]')).toContainText("Reason: The landing page did not match the ad.");
    await expect(page.locator('[data-ad-row="pending_payment"]').getByRole("button", { name: "Finish payment" })).toBeVisible();
    await expectNoSeriousViolations(page);
    await page.screenshot({ path: r12Shot(testInfo, "my-ads"), fullPage: true });
  });
});
