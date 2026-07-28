import { describe, expect, it } from "vitest";
import { classifyMarketplaceItem, enrichSearchParamsWithClassification } from "@/lib/search/item-classifier";

describe("deterministic marketplace item classifier", () => {
  it("classifies detailed buyer intent without an LLM", () => {
    const result = classifyMarketplaceItem("trusted mirrorless camera under $1700 with pickup");

    expect(result.category).toBe("electronics");
    expect(result.categoryConfidence).toBeGreaterThan(0.8);
    expect(result.filters).toMatchObject({
      category: "electronics",
      maxPrice: 1700,
      minSellerTrust: 85,
      fulfillment: "pickup",
    });
    expect(result.source).toBe("deterministic");
  });

  it("extracts price ranges and condition", () => {
    const result = classifyMarketplaceItem("like new sofa between 500 and 900 with delivery");

    expect(result.category).toBe("furniture");
    expect(result.filters.minPrice).toBe(500);
    expect(result.filters.maxPrice).toBe(900);
    expect(result.filters.condition).toEqual(["Like new"]);
    expect(result.filters.fulfillment).toBe("delivery");
  });

  it("flags artifact classes that require extra safety handling", () => {
    expect(classifyMarketplaceItem("sealed iTunes gift card").safetySignals).toContain("gift_card");
    expect(classifyMarketplaceItem("firearm for sale").safetySignals).toContain("regulated_goods");
  });

  it("returns a safe low-confidence result for unknown items", () => {
    const result = classifyMarketplaceItem("handmade unusual object");
    expect(result.category).toBeUndefined();
    expect(result.categoryConfidence).toBeLessThan(0.5);
  });

  it("turns natural language into ordinary search filters", () => {
    expect(enrichSearchParamsWithClassification({
      q: "trusted camera under €900 with pickup",
      sort: "recommended",
    })).toMatchObject({
      q: "camera",
      category: "electronics",
      maxPrice: 900,
      minSellerTrust: 85,
      fulfillment: "pickup",
      sort: "recommended",
    });
  });

  it("never replaces filters selected explicitly by the shopper", () => {
    const result = enrichSearchParamsWithClassification({
      q: "used sofa under $900 with delivery",
      category: "free-items",
      maxPrice: 200,
      condition: ["New"],
      fulfillment: "pickup",
    });

    expect(result).toMatchObject({
      category: "free-items",
      maxPrice: 200,
      condition: ["New"],
      fulfillment: "pickup",
    });
  });
});
