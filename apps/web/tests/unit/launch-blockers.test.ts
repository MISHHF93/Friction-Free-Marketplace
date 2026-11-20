import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    throw new Error("database unavailable");
  }
}));

import { getFavoritesDashboard, getSavedSearchesDashboard } from "@/lib/saves/user-saves";
import { upsertSellerAccountFromStripe } from "@/lib/payments/connect";
import { incrementalRefundCents } from "@/lib/payments/record-outcome";
import { uncapturedDisputeAction } from "@/lib/payments/settlement";

const root = resolve(__dirname, "../../../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260728150000_launch_blocker_guards.sql"), "utf8");
const reset = readFileSync(resolve(root, "scripts/prod/reset-demo-data.sql"), "utf8");

describe("privilege writers", () => {
  it("lets confirmation and account deletion set the privilege flag", () => {
    const activate = migration.slice(migration.indexOf("function public.activate_auth_user_profile"), migration.indexOf("function public.anonymize_marketplace_account"));
    const anonymize = migration.slice(migration.indexOf("function public.anonymize_marketplace_account"), migration.indexOf("function public.handle_new_auth_user"));
    expect(activate).toContain("set_config('app.allow_privileged_user_update', 'on', true)");
    expect(activate).toContain("status = 'pending'");
    expect(anonymize).toContain("set_config('app.allow_privileged_user_update', 'on', true)");
    expect(anonymize).toContain("status = 'deleted'");
    expect(migration).toContain("old.status = 'pending'");
    expect(migration).toContain("new.status = 'active'");
    const signup = readFileSync(resolve(root, "apps/web/app/auth/actions.ts"), "utf8");
    expect(signup).toContain("ignoreDuplicates: true");
  });

  it("locks the transaction before the payment", () => {
    const claim = migration.slice(migration.indexOf("function public.claim_escrow_payment"), migration.indexOf("function public.claim_dispute_settlement"));
    expect(claim.indexOf("into txn from public.transactions")).toBeLessThan(claim.indexOf("into payment from public.escrow_payments"));
    const dispute = migration.slice(migration.indexOf("function public.claim_dispute_settlement"), migration.indexOf("function public.admin_set_user_status"));
    expect(dispute.indexOf("into txn from public.transactions")).toBeLessThan(dispute.indexOf("into payment from public.escrow_payments"));
  });
});

describe("open checkout indexes", () => {
  it("includes resolving in both partial unique indexes", () => {
    expect(migration).toContain("transactions_one_open_checkout_per_listing_idx");
    expect(migration).toContain("transactions_open_offer_uidx");
    const listingIndex = migration.slice(migration.indexOf("transactions_one_open_checkout_per_listing_idx"), migration.indexOf("transactions_open_offer_uidx"));
    const offerIndex = migration.slice(migration.indexOf("transactions_open_offer_uidx"), migration.indexOf("function public.admin_role_rank"));
    expect(listingIndex).toContain("'resolving'");
    expect(offerIndex).toContain("'resolving'");
  });
});

describe("demo reset", () => {
  it("stops on error, requires the session flag, and does not delete by title", () => {
    expect(reset).toContain("\\set ON_ERROR_STOP on");
    expect(reset).toContain("app.reset_allowed");
    expect(reset).toContain("44444444-4444-4444-8444-444444444444");
    expect(reset).not.toContain("Verified carbon road bike");
    expect(reset.trimEnd().endsWith("rollback;")).toBe(true);
  });
});

describe("uncaptured disputes and reconcile journals", () => {
  it("cancels a buyer refund and captures a seller release or split", () => {
    expect(uncapturedDisputeAction("refund_buyer")).toBe("cancel");
    expect(uncapturedDisputeAction("release_seller")).toBe("capture");
    expect(uncapturedDisputeAction("split")).toBe("capture");
  });

  it("journals only the new refund cents", () => {
    expect(incrementalRefundCents(250, 400)).toBe(150);
    expect(incrementalRefundCents(400, 400)).toBe(0);
  });
});

describe("connect status updates", () => {
  it("writes the seller payment account and not users.status", async () => {
    const tables: string[] = [];
    const supabase = {
      from(table: string) {
        tables.push(table);
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: async () => ({ data: { seller_id: "seller-1", status: "onboarding", onboarding_completed_at: null }, error: null }),
          upsert: async () => ({ error: null }),
          insert: async () => ({ error: null })
        };
      }
    };
    await upsertSellerAccountFromStripe(supabase as never, {
      id: "acct_test",
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
      metadata: { seller_id: "seller-1" },
      requirements: {},
      business_type: "individual",
      country: "US",
      default_currency: "usd",
      capabilities: {}
    } as never);
    expect(tables).toContain("seller_payment_accounts");
    expect(tables).not.toContain("users");
  });
});

describe("saved data when the database fails", () => {
  beforeEach(() => {
    delete process.env.MARKETPLACE_DEMO_MODE;
  });

  it("returns empty favorites and saved searches in production", async () => {
    const favorites = await getFavoritesDashboard("11111111-1111-4111-8111-111111111111");
    const searches = await getSavedSearchesDashboard("11111111-1111-4111-8111-111111111111");
    expect(favorites).toMatchObject({ favorites: [], source: "database" });
    expect(searches).toMatchObject({ searches: [], recentMatches: [], source: "database" });
  });
});
