import { describe, expect, it } from "vitest";
import { isPickupHandoff, listingAllowsPickup, listingAllowsShipping } from "@/lib/payments/pickup";

describe("local pickup handoff", () => {
  it("detects pickup-only listings and does not invent shipping", () => {
    expect(listingAllowsPickup({ pickup_available: true })).toBe(true);
    expect(listingAllowsShipping({ pickup_available: true, ships_to: [] })).toBe(false);
    expect(listingAllowsShipping({ pickup_available: true, ships_to: ["US"] })).toBe(true);
  });

  it("keeps shipping as the default when pickup is not offered", () => {
    expect(listingAllowsPickup({ pickup_available: false })).toBe(false);
    expect(listingAllowsShipping({ pickup_available: false })).toBe(true);
  });

  it("recognizes a recorded pickup handoff without a tracking number", () => {
    expect(isPickupHandoff({ fulfillment_method: "pickup", seller_handoff_at: "2026-11-22T00:00:00.000Z" })).toBe(true);
    expect(isPickupHandoff({ carrier: "UPS", tracking_number: "1Z999" })).toBe(false);
  });
});
