import { expect, test } from "@playwright/test";

test.describe("marketplace assistant experience", () => {
  test("opens from the header, traps interaction, and restores focus", async ({ page }) => {
    await page.goto("/");
    const launcher = page.getByRole("button", { name: "Open marketplace AI assistant" });
    await launcher.click();

    await expect(page.getByRole("dialog", { name: "Marketplace copilot" })).toBeVisible();
    await expect(page.getByLabel("Ask the marketplace assistant")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Marketplace copilot" })).toBeHidden();
    await expect(launcher).toBeFocused();
  });

  test("renders every scoped assistant and an accessible request composer", async ({ page }) => {
    await page.goto("/assistant");

    await expect(page.getByRole("heading", { name: "AI help with clear limits." })).toBeVisible();
    await expect(page.getByRole("button", { name: /buyer agent/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /fraud detection agent/i })).toBeVisible();
    await expect(page.getByLabel("Request")).toBeVisible();
    await expect(page.getByRole("button", { name: /run assistant/i })).toBeEnabled();
  });

  test("submits a request and presents structured model results", async ({ page }) => {
    await page.route("**/api/ai/agents/run", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          latencyMs: 84,
          result: {
            answer: "Compare condition, seller trust, and fulfillment terms before choosing.",
            recommendedActions: ["Review the listing details"],
            toolPlan: [{ tool: "compare_listings", reason: "Compare value and trust signals." }],
            safetyFlags: [],
            memoryUpdates: [],
            auditSummary: "Read-only comparison proposed.",
            model: "gpt-4o-mini",
            fallback: false
          }
        })
      });
    });

    await page.goto("/assistant");
    await page.getByLabel("Request").fill("Help me compare two camera listings.");
    await page.getByRole("button", { name: /run assistant/i }).click();

    await expect(page.getByText(/compare condition, seller trust/i)).toBeVisible();
    await expect(page.getByText("Response: 84 ms")).toBeVisible();
    await expect(page.getByText(/compare_listings: compare value/i)).toBeVisible();
    await expect(page.getByText(/read-only comparison proposed/i)).toBeVisible();
  });
});
