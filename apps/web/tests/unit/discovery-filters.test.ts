import { describe, expect, it } from "vitest";
import {
  discoveryParamEntries,
  parseDiscoveryParamsFromRecord,
  parseDiscoveryParamsFromUrl,
  serializeDiscoveryParams,
} from "@/lib/search/filters";
import { parseDiscoverySearchParamsFromUrl } from "@/lib/search/api";

describe("discovery filter contract", () => {
  it("parses repeated and comma-separated filters from route search params", () => {
    const params = parseDiscoveryParamsFromRecord({
      q: "camera kit",
      category: "electronics",
      condition: ["Like new", "Good"],
      minPrice: "100",
      maxPrice: "900",
      verifiedOnly: "on",
      paymentProtection: "true",
      fulfillment: "pickup",
      page: "2",
    });

    expect(params.q).toBe("camera kit");
    expect(params.condition).toEqual(["Like new", "Good"]);
    expect(params.minPrice).toBe(100);
    expect(params.maxPrice).toBe(900);
    expect(params.verifiedOnly).toBe(true);
    expect(params.paymentProtection).toBe(true);
    expect(params.fulfillment).toBe("pickup");
    expect(params.page).toBe(2);
  });

  it("applies route-specific default sort values", () => {
    expect(parseDiscoveryParamsFromRecord({}, { sort: "recommended" }).sort).toBe("recommended");
    expect(parseDiscoveryParamsFromRecord({}, { sort: "newest" }).sort).toBe("newest");
    expect(parseDiscoveryParamsFromRecord({ sort: "unknown" }, { sort: "recommended" }).sort).toBe("recommended");
  });

  it("serializes URL query strings without transient defaults", () => {
    const query = serializeDiscoveryParams({
      q: "road bike",
      category: "sports",
      condition: ["Good", "Fair"],
      verifiedOnly: true,
      paymentProtection: false,
      page: 3,
      limit: 18,
    });

    expect(query).toContain("q=road+bike");
    expect(query).toContain("category=sports");
    expect(query).toContain("condition=Good%2CFair");
    expect(query).toContain("verifiedOnly=true");
    expect(query).toContain("page=3");
    expect(query).not.toContain("paymentProtection");
    expect(query).not.toContain("limit");
  });

  it("creates saved-search-safe hidden field entries", () => {
    const entries = discoveryParamEntries({
      q: "desk",
      condition: ["Excellent"],
      verifiedOnly: true,
      page: 4,
      limit: 18,
    }, ["page", "limit"]);

    expect(entries).toEqual([
      ["q", "desk"],
      ["condition", "Excellent"],
      ["verifiedOnly", "true"],
    ]);
  });

  it("keeps API and UI URL parsing in parity", () => {
    const url = new URL("https://example.com/search?q=sofa&condition=Good,Fair&sort=best_value&maxPrice=500");

    expect(parseDiscoverySearchParamsFromUrl(url)).toEqual(parseDiscoveryParamsFromUrl(url, { sort: "newest" }));
  });
});
