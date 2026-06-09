import { describe, expect, it } from "vitest";
import {
  calculateListingVelocityRule,
  calculateMessageReportRateRule,
  calculateNewAccountExpensiveItemRule,
  calculateRepeatedExternalPaymentRule,
  combineFraudRiskScores,
  createStableImageHash,
  normalizeListingTitleForFraud,
  scoreCategoryMismatchForText
} from "@/lib/fraud/detection";
import { detectScamMessage, detectSuspiciousPricing, scoreDuplicateImageMatch } from "@/lib/trust-safety/engine";

describe("fraud detection rules", () => {
  it("flags suspiciously low prices against category baselines", () => {
    const result = detectSuspiciousPricing({
      listingId: "listing-1",
      priceAmount: 250,
      currency: "USD",
      categoryMedian: 1000,
      categoryP10: 650
    });

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.title).toBe("Suspiciously low price");
  });

  it("normalizes duplicate titles consistently", () => {
    expect(normalizeListingTitleForFraud("Canon EOS-R5 Camera Kit!!!")).toBe(normalizeListingTitleForFraud("canon eos r5 camera kit"));
  });

  it("creates stable hashes for duplicate image inputs", () => {
    const first = createStableImageHash({ storage_path: "seller/listing/photo.jpg", public_url: "https://cdn.example/photo.jpg" });
    const second = createStableImageHash({ storage_path: "different/path.jpg", public_url: "https://cdn.example/photo.jpg" });

    expect(first).toBe(second);
  });

  it("scores duplicate image hash matches as high risk when cross-seller", () => {
    const result = scoreDuplicateImageMatch(100, true, true);

    expect(result.score).toBe(100);
    expect(result.severity).toBe("critical");
  });

  it("flags new accounts posting expensive items", () => {
    const result = calculateNewAccountExpensiveItemRule({
      accountAgeDays: 2,
      categorySlug: "electronics",
      priceAmount: 2200,
      currency: "USD"
    });

    expect(result?.type).toBe("new_account_expensive_item");
    expect(result?.score).toBeGreaterThanOrEqual(70);
  });

  it("detects repeated external payment language", () => {
    const messageRisk = detectScamMessage("Can you pay outside the app with zelle or crypto?");
    const result = calculateRepeatedExternalPaymentRule({
      messageRiskScore: messageRisk.score,
      repeatedCount: 3,
      matchedPatterns: messageRisk.matchedPatterns,
      classification: messageRisk.classification
    });

    expect(messageRisk.classification).toBe("off_platform_payment");
    expect(result?.type).toBe("repeated_external_payment_language");
    expect(result?.score).toBeGreaterThanOrEqual(70);
  });

  it("flags high message report rates", () => {
    const result = calculateMessageReportRateRule({ reportCount: 5, messageCount: 10 });

    expect(result?.type).toBe("high_message_report_rate");
    expect(result?.severity).toMatch(/high|critical/);
  });

  it("flags too many listings too quickly", () => {
    const result = calculateListingVelocityRule({ hourCount: 8, dayCount: 24 });

    expect(result?.type).toBe("too_many_listings_too_quickly");
    expect(result?.score).toBeGreaterThanOrEqual(60);
  });

  it("flags category and description mismatches", () => {
    const result = scoreCategoryMismatchForText({
      categorySlug: "home",
      title: "Sony A7IV camera lens kit",
      description: "Mirrorless camera body with lens, battery, charger, and camera bag."
    });

    expect(result?.type).toBe("mismatched_category_description");
    expect(result?.payload.suggested_category).toBe("electronics");
  });

  it("combines multiple rule scores into a block-level score", () => {
    expect(combineFraudRiskScores([{ score: 78 }, { score: 70 }, { score: 65 }])).toBeGreaterThanOrEqual(85);
  });
});
