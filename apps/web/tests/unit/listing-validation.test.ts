import { describe, expect, it } from "vitest";
import { buildMeiliSearchPayload } from "@/lib/search/meilisearch";
import {
  listingFormSchema,
  listingStatusSchema,
  slugifyListingTitle,
} from "@/lib/listings/validation";

describe("listing validation", () => {
  it("accepts a complete listing payload", () => {
    const result = listingFormSchema.parse({
      title: "Vintage walnut writing desk",
      description:
        "A sturdy mid-century desk with dovetail drawers and only light cosmetic wear.",
      category: "home",
      condition: "good",
      priceAmount: "325.50",
      locationCity: "Portland",
      locationRegion: "OR",
      fulfillmentOptions: ["pickup"],
      publish: true,
    });

    expect(result.currency).toBe("USD");
    expect(result.quantity).toBe(1);
    expect(result.publish).toBe(true);
  });

  it("rejects prices with more than two decimal places", () => {
    expect(() =>
      listingFormSchema.parse({
        title: "Vintage walnut writing desk",
        description:
          "A sturdy mid-century desk with dovetail drawers and only light cosmetic wear.",
        category: "home",
        condition: "good",
        priceAmount: "325.505",
        locationCity: "Portland",
        locationRegion: "OR",
        fulfillmentOptions: ["pickup"],
      }),
    ).toThrow("Price can include cents only.");
  });

  it("generates URL-safe listing slugs", () => {
    expect(slugifyListingTitle("AI-Curated Camera Kit!!!")).toBe(
      "ai-curated-camera-kit",
    );
  });

  it("accepts lifecycle statuses used by seller listing management", () => {
    expect(listingStatusSchema.parse("draft")).toBe("draft");
    expect(listingStatusSchema.parse("active")).toBe("active");
    expect(listingStatusSchema.parse("sold")).toBe("sold");
    expect(() => listingStatusSchema.parse("deleted")).toThrow();
  });
});

describe("Meilisearch payload builder", () => {
  it("adds safety, category, and price filters", () => {
    const payload = buildMeiliSearchPayload({
      q: "camera",
      category: "electronics",
      minPrice: 100,
      maxPrice: 500,
      minSellerTrust: 80,
    });
    expect(payload.filter).toContain('status = "active"');
    expect(payload.filter).toContain('category_slug = "electronics"');
    expect(payload.filter).toContain("price_amount >= 100");
    expect(payload.filter).toContain("seller_trust_score >= 80");
  });
});
