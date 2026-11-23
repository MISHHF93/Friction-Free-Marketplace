import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/stripe/server", () => ({ getStripe: () => { throw new Error("tests pass a stripe stub"); } }));

import {
  advertiserStatusLabel,
  buildAdWindow,
  canTransitionAd,
  PLACEHOLDER_AD_PRICING,
  quoteAdPrice,
  validateAdvertiserTarget,
  windowOnApproval
} from "@/lib/ads/self-serve";
import { adCheckoutSessionParams, adImagePathBelongsTo, AdCheckoutError, startNewAdCheckout } from "@/lib/ads/checkout";
import { applyAdCheckoutCompleted, approveSelfServeAd, rejectSelfServeAd } from "@/lib/ads/payments";
import { renderNotificationTemplate } from "@/lib/notifications/templates";

type Row = Record<string, any>;

function fakeDb(tables: Record<string, Row[]>) {
  const writes: Array<{ table: string; op: string; value: unknown }> = [];
  function from(name: string) {
    tables[name] ??= [];
    const filters: Array<(row: Row) => boolean> = [];
    let op: "select" | "update" | "insert" = "select";
    let patch: Row | null = null;
    let inserted: Row | null = null;
    const matching = () => tables[name].filter((row) => filters.every((f) => f(row)));
    const run = () => {
      if (op === "insert" && inserted) return { data: [inserted], error: null };
      if (op === "update" && patch) {
        const hits = matching();
        for (const row of hits) Object.assign(row, patch);
        return { data: hits.map((row) => ({ ...row })), error: null };
      }
      return { data: matching().map((row) => ({ ...row })), error: null };
    };
    const chain: any = {
      select: () => chain,
      order: () => chain,
      limit: () => chain,
      eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return chain; },
      in: (c: string, v: unknown[]) => { filters.push((r) => v.includes(r[c])); return chain; },
      is: (c: string, v: unknown) => { filters.push((r) => (r[c] ?? null) === v); return chain; },
      update: (value: Row) => { op = "update"; patch = value; writes.push({ table: name, op: "update", value }); return chain; },
      insert: (value: Row) => {
        op = "insert";
        inserted = { id: `00000000-0000-4000-8000-${String(tables[name].length + 1).padStart(12, "0")}`, paid_at: null, stripe_checkout_session_id: null, ...value };
        tables[name].push(inserted);
        writes.push({ table: name, op: "insert", value });
        return chain;
      },
      maybeSingle: async () => { const r = run(); return { data: r.data[0] ?? null, error: null }; },
      single: async () => { const r = run(); return r.data[0] ? { data: r.data[0], error: null } : { data: null, error: { message: "no rows" } }; },
      then: (resolve: (value: unknown) => unknown) => resolve(run())
    };
    return chain;
  }
  return { from, writes, tables };
}

const ADV = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CAMPAIGN = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("self-serve ad pricing and schedule", () => {
  it("prices per day from the pricing row and enforces run length bounds", () => {
    expect(quoteAdPrice(PLACEHOLDER_AD_PRICING.home_top_banner, 7)).toBe(14000);
    expect(() => quoteAdPrice(PLACEHOLDER_AD_PRICING.home_top_banner, 0)).toThrow(/between 1 and 30/);
    expect(() => quoteAdPrice(PLACEHOLDER_AD_PRICING.home_top_banner, 31)).toThrow();
    expect(() => quoteAdPrice({ ...PLACEHOLDER_AD_PRICING.home_inline, self_serve_enabled: false }, 3)).toThrow(/not open/);
  });

  it("labels every default price as a placeholder", () => {
    expect(Object.values(PLACEHOLDER_AD_PRICING).every((row) => row.is_placeholder)).toBe(true);
  });

  it("builds a window that never starts in the past and lasts the full run", () => {
    const now = new Date("2026-11-22T15:30:00.000Z");
    const today = buildAdWindow("2026-11-22", 3, now);
    expect(today.starts_at).toBe(now.toISOString());
    expect(Date.parse(today.ends_at) - Date.parse(today.starts_at)).toBe(3 * 86_400_000);
    expect(buildAdWindow("2026-11-25", 1, now).starts_at).toBe("2026-11-25T00:00:00.000Z");
    expect(() => buildAdWindow("2026-11-21", 1, now)).toThrow(/past/);
    expect(() => buildAdWindow("2027-06-01", 1, now)).toThrow(/90 days/);
  });

  it("shifts a late approval so the advertiser keeps every paid day", () => {
    const now = new Date("2026-11-24T00:00:00.000Z");
    const late = windowOnApproval("2026-11-22T00:00:00.000Z", 7, now);
    expect(late).toEqual({ starts_at: now.toISOString(), ends_at: "2026-12-01T00:00:00.000Z", status: "active" });
    const early = windowOnApproval("2026-11-30T00:00:00.000Z", 7, now);
    expect(early.status).toBe("approved");
    expect(early.starts_at).toBe("2026-11-30T00:00:00.000Z");
  });

  it("only allows the documented lifecycle", () => {
    expect(canTransitionAd("draft", "pending_payment")).toBe(true);
    expect(canTransitionAd("pending_payment", "paid_pending_review")).toBe(true);
    expect(canTransitionAd("paid_pending_review", "rejected")).toBe(true);
    expect(canTransitionAd("draft", "approved")).toBe(false);
    expect(canTransitionAd("pending_payment", "approved")).toBe(false);
    expect(canTransitionAd("rejected", "approved")).toBe(false);
    expect(canTransitionAd("expired", "active")).toBe(false);
    expect(advertiserStatusLabel("rejected", "", null)).toMatch(/Refund/);
  });

  it("accepts only https advertiser links", () => {
    expect(validateAdvertiserTarget("https://shop.example.com/sale")).toBe("https://shop.example.com/sale");
    for (const bad of ["http://shop.example.com", "javascript:alert(1)", "//evil.example", "https://user:pw@shop.example.com", "https://localhost", "/internal"]) {
      expect(validateAdvertiserTarget(bad)).toBeNull();
    }
  });
});

describe("self-serve ad checkout", () => {
  it("only accepts images the advertiser uploaded", () => {
    expect(adImagePathBelongsTo(`advertisers/${ADV}/x.png`, ADV)).toBe(true);
    expect(adImagePathBelongsTo("advertisers/other/x.png", ADV)).toBe(false);
    expect(adImagePathBelongsTo(`advertisers/${ADV}/../x.png`, ADV)).toBe(false);
    expect(adImagePathBelongsTo("campaigns/x.png", ADV)).toBe(false);
  });

  it("creates a normal platform Checkout charge tagged as an ad, never an escrow transaction", () => {
    const params = adCheckoutSessionParams({
      id: CAMPAIGN, advertiser_id: ADV, placement: "search_inline", title: "Sale", status: "draft",
      starts_at: "2026-11-25T00:00:00.000Z", ends_at: "2026-12-02T00:00:00.000Z", run_days: 7, price_cents: 10500, currency: "usd",
      stripe_checkout_session_id: null, paid_at: null
    }, "a@example.com", "https://frictionfree.co/", new Date("2026-11-22T00:00:00.000Z"));
    expect(params.mode).toBe("payment");
    expect(params.line_items?.[0]?.price_data?.unit_amount).toBe(10500);
    expect(params.metadata).toEqual({ kind: "ad_campaign", ad_campaign_id: CAMPAIGN, advertiser_id: ADV });
    expect(params.payment_intent_data?.metadata).not.toHaveProperty("transaction_id");
    expect(params.payment_intent_data).not.toHaveProperty("transfer_data");
    expect(params.payment_intent_data).not.toHaveProperty("application_fee_amount");
    expect(params.success_url).toBe(`https://frictionfree.co/dashboard/ads?checkout=success&ad=${CAMPAIGN}`);
  });

  it("prices from the server table and stores a pending_payment ad with the session", async () => {
    const db = fakeDb({ ad_campaigns: [] });
    const create = vi.fn(async () => ({ id: "cs_test_1", url: "https://checkout.stripe.com/c/cs_test_1" }));
    const result = await startNewAdCheckout({
      supabase: db,
      stripe: { checkout: { sessions: { create, retrieve: vi.fn() } } } as any,
      appUrl: "https://frictionfree.co",
      loadPricing: async () => ({ ...PLACEHOLDER_AD_PRICING.dashboard_card, price_cents_per_day: 700 }),
      now: new Date("2026-11-22T12:00:00.000Z")
    }, { id: ADV, email: "a@example.com" }, {
      placement: "dashboard_card", title: "Moving sale", advertiserName: "A", targetUrl: "https://a.example.com",
      imagePath: `advertisers/${ADV}/img.png`, startDate: "2026-11-23", runDays: 3
    }, "request-key-0001");
    expect(result.url).toContain("checkout.stripe.com");
    const row = db.tables.ad_campaigns[0];
    expect(row).toMatchObject({ status: "pending_payment", price_cents: 2100, source: "self_serve", advertiser_id: ADV, stripe_checkout_session_id: "cs_test_1" });
    expect(create).toHaveBeenCalledWith(expect.anything(), { idempotencyKey: `ad-checkout:${row.id}:request-key-0001` });
  });

  it("refuses an image from another advertiser", async () => {
    const db = fakeDb({ ad_campaigns: [] });
    await expect(startNewAdCheckout({
      supabase: db, stripe: { checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } } } as any,
      appUrl: "https://frictionfree.co", loadPricing: async () => PLACEHOLDER_AD_PRICING.home_inline
    }, { id: ADV, email: null }, {
      placement: "home_inline", title: "x", advertiserName: "A", targetUrl: "https://a.example.com",
      imagePath: "advertisers/someone-else/img.png", startDate: "2026-11-23", runDays: 3
    }, "request-key-0002")).rejects.toBeInstanceOf(AdCheckoutError);
  });
});

function paidSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_test_1",
    metadata: { kind: "ad_campaign", ad_campaign_id: CAMPAIGN },
    payment_status: "paid",
    payment_intent: "pi_1",
    amount_total: 10500,
    currency: "usd",
    ...overrides
  } as any;
}

function campaignRow(overrides: Row = {}): Row {
  return { id: CAMPAIGN, advertiser_id: ADV, title: "Sale", status: "pending_payment", price_cents: 10500, currency: "usd", paid_at: null, stripe_payment_intent_id: null, starts_at: "2026-11-20T00:00:00.000Z", run_days: 7, ...overrides };
}

describe("self-serve ad payment webhook and review", () => {
  it("ignores Checkout sessions that are not ad purchases", async () => {
    const db = fakeDb({ ad_campaigns: [campaignRow()] });
    const result = await applyAdCheckoutCompleted({ supabase: db, stripe: { refunds: { create: vi.fn() } } as any, notify: vi.fn() }, paidSession({ metadata: {} }));
    expect(result.handled).toBe(false);
    expect(db.tables.ad_campaigns[0].status).toBe("pending_payment");
  });

  it("marks a paid ad for review once and notifies the advertiser", async () => {
    const db = fakeDb({ ad_campaigns: [campaignRow()], audit_logs: [] });
    const notify = vi.fn(async () => undefined);
    const deps = { supabase: db, stripe: { refunds: { create: vi.fn() } } as any, notify };
    expect((await applyAdCheckoutCompleted(deps, paidSession())).result).toBe("paid");
    expect(db.tables.ad_campaigns[0]).toMatchObject({ status: "paid_pending_review", stripe_payment_intent_id: "pi_1" });
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ userId: ADV, template: "ad_payment_received" }));
    expect((await applyAdCheckoutCompleted(deps, paidSession())).result).toBe("duplicate");
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("does not advance an ad when the paid amount does not match", async () => {
    const db = fakeDb({ ad_campaigns: [campaignRow()], audit_logs: [] });
    const result = await applyAdCheckoutCompleted({ supabase: db, stripe: { refunds: { create: vi.fn() } } as any, notify: vi.fn() }, paidSession({ amount_total: 100 }));
    expect(result.result).toBe("amount_mismatch");
    expect(db.tables.ad_campaigns[0].status).toBe("pending_payment");
  });

  it("refunds a second payment for an ad that is already paid", async () => {
    const db = fakeDb({ ad_campaigns: [campaignRow({ status: "paid_pending_review", paid_at: "2026-11-22T00:00:00.000Z", stripe_payment_intent_id: "pi_1" })], audit_logs: [] });
    const create = vi.fn(async () => ({ id: "re_dup" }));
    const result = await applyAdCheckoutCompleted({ supabase: db, stripe: { refunds: { create } } as any, notify: vi.fn() }, paidSession({ payment_intent: "pi_2" }));
    expect(result.result).toBe("duplicate_refunded");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ payment_intent: "pi_2" }), { idempotencyKey: "ad-duplicate-refund:pi_2" });
  });

  it("approves only paid ads in review and notifies the advertiser", async () => {
    const db = fakeDb({ ad_campaigns: [campaignRow({ status: "paid_pending_review", paid_at: "2026-11-21T00:00:00.000Z", stripe_payment_intent_id: "pi_1" })], audit_logs: [] });
    const notify = vi.fn(async () => undefined);
    const now = new Date("2026-11-22T00:00:00.000Z");
    await approveSelfServeAd({ supabase: db, stripe: { refunds: { create: vi.fn() } } as any, notify, now }, CAMPAIGN, "admin-1");
    expect(db.tables.ad_campaigns[0]).toMatchObject({ status: "active", starts_at: now.toISOString(), reviewed_by: "admin-1" });
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ template: "ad_approved" }));
    await expect(approveSelfServeAd({ supabase: db, stripe: {} as any, notify, now }, CAMPAIGN, "admin-1")).rejects.toThrow(/waiting for review/);
  });

  it("rejecting requires a reason, refunds through Stripe and notifies", async () => {
    const db = fakeDb({ ad_campaigns: [campaignRow({ status: "paid_pending_review", paid_at: "2026-11-21T00:00:00.000Z", stripe_payment_intent_id: "pi_1" })], audit_logs: [] });
    const create = vi.fn(async () => ({ id: "re_1" }));
    const notify = vi.fn(async () => undefined);
    const deps = { supabase: db, stripe: { refunds: { create } } as any, notify };
    await expect(rejectSelfServeAd(deps, CAMPAIGN, "admin-1", "  ")).rejects.toThrow(/reason/);
    expect(create).not.toHaveBeenCalled();
    await rejectSelfServeAd(deps, CAMPAIGN, "admin-1", "Landing page does not match");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ payment_intent: "pi_1" }), { idempotencyKey: `ad-reject-refund:${CAMPAIGN}` });
    expect(db.tables.ad_campaigns[0]).toMatchObject({ status: "rejected", stripe_refund_id: "re_1", rejection_reason: "Landing page does not match", is_active: false });
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ template: "ad_rejected", input: expect.objectContaining({ reason: "Landing page does not match" }) }));
  });

  it("a mail failure does not undo a review decision", async () => {
    const db = fakeDb({ ad_campaigns: [campaignRow({ status: "paid_pending_review", paid_at: "2026-11-21T00:00:00.000Z", stripe_payment_intent_id: "pi_1" })], audit_logs: [] });
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await approveSelfServeAd({ supabase: db, stripe: {} as any, notify: async () => { throw new Error("resend down"); } }, CAMPAIGN, "admin-1");
    expect(db.tables.ad_campaigns[0].status).not.toBe("paid_pending_review");
    spy.mockRestore();
  });

  it("renders the advertiser notifications", () => {
    expect(renderNotificationTemplate("ad_rejected", { adTitle: "Sale", reason: "Off-topic", amount: "105.00", currency: "USD" }).body).toContain("full refund of $105.00");
    expect(renderNotificationTemplate("ad_approved", { adTitle: "Sale" }).topic).toBe("payments");
    expect(renderNotificationTemplate("ad_payment_received", { adTitle: "Sale", amount: "105.00", currency: "USD" }).emailSubject).toBe("Ad payment received");
  });
});

describe("launch docs list every handled Stripe event", () => {
  it("documents each platform webhook case, including checkout.session.completed", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("lib/payments/stripe-events.ts", "utf8");
    const launch = readFileSync("../../docs/LAUNCH.md", "utf8");
    const platform = launch.split("Platform, `/api/stripe/webhooks`")[1]?.split("Connect, `/api/stripe/connect/webhook`")[0] ?? "";
    const handled = [...source.matchAll(/case "([a-z_.]+)":/g)].map((match) => match[1]).filter((event) => !event.startsWith("account."));
    expect(handled).toContain("checkout.session.completed");
    for (const event of handled) expect(platform, event).toContain(`\`${event}\``);
  });
});
