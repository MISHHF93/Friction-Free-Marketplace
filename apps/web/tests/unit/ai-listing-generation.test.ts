import { describe, expect, it } from "vitest";
import {
  aiListingGenerationSchema,
  buildAiListingPrompt,
  normalizeAiListingGenerationRequest,
} from "@/lib/ai/listing-generation";

describe("AI listing generation", () => {
  it("normalizes image URLs, title, and notes into a prompt-ready request", () => {
    const request = normalizeAiListingGenerationRequest({
      imageUrls: ["https://example.com/listing-1.jpg"],
      title: "Sony camera kit",
      notes: "Includes two lenses and a small carrying case.",
      location: "Portland, OR",
    });

    expect(request.images).toEqual([
      { url: "https://example.com/listing-1.jpg", sortOrder: 0 },
    ]);
    expect(request.title).toBe("Sony camera kit");
    expect(request.notes).toContain("two lenses");

    const prompt = buildAiListingPrompt(request);
    expect(prompt.userText).toContain("Seller supplied title: Sony camera kit");
    expect(prompt.system).toContain("structured fraud indicators");
  });

  it("rejects requests without listing images", () => {
    expect(() =>
      normalizeAiListingGenerationRequest({
        title: "Desk lamp",
        notes: "Used in office.",
      }),
    ).toThrow("Upload at least one listing photo.");
  });

  it("validates the complete structured listing output", () => {
    const parsed = aiListingGenerationSchema.parse({
      title: "Vintage walnut desk",
      description:
        "A clean walnut writing desk with visible light wear. Confirm exact dimensions and drawer condition before publishing.",
      category: "home",
      categoryRationale: "The item appears to be furniture for home office use.",
      condition: "good",
      conditionConfidence: 0.74,
      conditionEvidence: ["Visible light cosmetic wear", "No major structural damage visible"],
      priceRange: {
        min: 225,
        max: 375,
        currency: "USD",
        confidence: 0.64,
        rationale: "Comparable used desks vary by wood quality and local pickup demand.",
      },
      seoTags: ["desk", "walnut desk", "home office", "furniture"],
      scamRiskWarning: {
        needed: false,
        riskScore: 18,
        warning: "",
        riskFactors: [],
      },
      fraudIndicators: {
        riskScore: 18,
        riskLevel: "low",
        reviewRequired: false,
        indicators: [],
        buyerWarning: "",
      },
      missingInformationQuestions: ["What are the exact dimensions of the desk?"],
      rationale: "The generated draft stays conservative and asks for dimensions before publication.",
    });

    expect(parsed.priceRange.min).toBeLessThan(parsed.priceRange.max);
    expect(parsed.fraudIndicators.riskLevel).toBe("low");
  });
});
