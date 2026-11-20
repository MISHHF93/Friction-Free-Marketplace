import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { assertMemberCanWrite, friendlyGuardMessage, isRestrictedMemberStatus, RESTRICTED_ACCOUNT_MESSAGE } from "@/lib/auth/member-status";
import { assertListingLifecyclePermission, listingModerationHold, type ListingPermissionRecord } from "@/lib/listings/permissions";

function listing(overrides: Partial<ListingPermissionRecord> = {}): ListingPermissionRecord {
  return {
    id: "l1", seller_id: "s1", title: "Oak desk", description: "A sturdy oak desk with two drawers.", status: "paused",
    price_amount: 100, quantity: 1, category_id: "c1", location_city: "Toronto", location_region: "ON",
    pickup_available: true, ships_to: [], deleted_at: null, metadata: {}, listing_images: [{ id: "i1", status: "ready" }],
    ...overrides
  };
}

function usersDb(status: string | null, error: unknown = null) {
  const chain: any = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: status ? { status } : null, error }) };
  return { from: () => chain };
}

describe("seller cannot republish an admin hold", () => {
  it("detects admin holds, fraud blocks and restriction pauses", () => {
    expect(listingModerationHold(listing({ metadata: { moderation_hold: "admin_hold" } }))).toBe("admin_hold");
    expect(listingModerationHold(listing({ metadata: { paused_by: "admin_restriction" } }))).toBe("admin_restriction");
    expect(listingModerationHold(listing({ metadata: { moderation_hold: "fraud_block" } }))).toBe("fraud_block");
    expect(listingModerationHold(listing())).toBeNull();
  });

  it("refuses publish on a held listing and allows it without a hold", () => {
    expect(() => assertListingLifecyclePermission(listing({ metadata: { moderation_hold: "admin_hold" } }), "s1", "publish")).toThrow(/on hold/);
    expect(() => assertListingLifecyclePermission(listing(), "s1", "publish")).not.toThrow();
  });

  it("refuses sold and archive while a listing is reserved for an open order", () => {
    expect(() => assertListingLifecyclePermission(listing({ status: "reserved" }), "s1", "mark_sold")).toThrow();
    expect(() => assertListingLifecyclePermission(listing({ status: "reserved" }), "s1", "archive")).toThrow();
  });

  it("admin listing actions go through the single decision RPC", () => {
    const source = readFileSync("lib/admin/mutations.ts", "utf8");
    expect(source).toContain('rpc("admin_record_listing_decision"');
    expect(source).not.toContain('status: action === "approve" ? "active"');
  });
});

describe("suspended members are blocked", () => {
  it("knows which statuses are restricted", () => {
    expect(isRestrictedMemberStatus("suspended")).toBe(true);
    expect(isRestrictedMemberStatus("banned")).toBe(true);
    expect(isRestrictedMemberStatus("active")).toBe(false);
    expect(isRestrictedMemberStatus("pending")).toBe(false);
  });

  it("refuses writes for a suspended member and lets active members through", async () => {
    await expect(assertMemberCanWrite(usersDb("suspended"), "u1")).rejects.toThrow(RESTRICTED_ACCOUNT_MESSAGE);
    await expect(assertMemberCanWrite(usersDb("active"), "u1")).resolves.toBeUndefined();
    await expect(assertMemberCanWrite(usersDb(null, { message: "down" }), "u1")).resolves.toBeUndefined();
  });

  it("turns database guard errors into plain language", () => {
    expect(friendlyGuardMessage(new Error("account_restricted: this account is suspended"))).toBe(RESTRICTED_ACCOUNT_MESSAGE);
    expect(friendlyGuardMessage({ message: "listing_on_hold: x" })).toMatch(/on hold/);
    expect(friendlyGuardMessage(new Error("other"))).toBeNull();
  });

  it("guards listing, messaging and offer writes in the app layer", () => {
    expect(readFileSync("actions/listings.ts", "utf8").match(/assertMemberCanWrite\(supabase, user\.id\)/g)?.length).toBe(4);
    const messaging = readFileSync("app/dashboard/messages/actions.ts", "utf8");
    for (const action of ["sendMessageAction", "makeOfferAction", "respondToOfferAction"]) {
      const body = messaging.slice(messaging.indexOf(`export async function ${action}`));
      expect(body.slice(0, body.indexOf("\nexport async function", 10))).toContain("requireWritingUser()");
    }
  });
});

describe("r10 migrations", () => {
  const migration = readFileSync("../../supabase/migrations/20261120010000_r10_moderation_and_member_enforcement.sql", "utf8");
  it("adds the listing guard, member write block, offer expiry, decision path and suspension lift", () => {
    for (const marker of ["guard_listing_member_change", "block_restricted_member_writes", "expire_offers_for_unavailable_listing", "admin_record_listing_decision", "lift_expired_suspensions"]) {
      expect(migration).toContain(marker);
    }
    expect(migration.toLowerCase()).not.toMatch(/drop table|drop column|delete from|truncate/);
  });
});
