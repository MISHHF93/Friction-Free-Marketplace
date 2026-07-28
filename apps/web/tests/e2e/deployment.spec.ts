import { expect, test } from "@playwright/test";

const browserOrigin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000").origin;

test("exposes deployment health and install metadata", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  await expect.poll(async () => (await health.json()).status).toBe("ok");

  const readiness = await request.get("/api/health/ready");
  expect(readiness.ok()).toBeTruthy();

  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  const body = await manifest.json();
  expect(body.name).toBe("Friction-Free Marketplace");
  expect(body.display).toBe("standalone");
});

test("publishes store-required privacy and offline pages", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy policy" })).toBeVisible();

  await page.goto("/offline");
  await expect(page.getByRole("heading", { name: "Reconnect to continue" })).toBeVisible();
});

test("does not issue anonymous storage upload tokens", async ({ request }) => {
  const response = await request.post("/api/uploads/sign", {
    headers: { Origin: browserOrigin },
    data: {
      purpose: "listing",
      files: [{ name: "photo.jpg", type: "image/jpeg", size: 1024 }]
    }
  });
  expect(response.status()).toBe(401);
});
