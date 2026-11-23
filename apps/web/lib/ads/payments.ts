import type Stripe from "stripe";
import { AD_CHECKOUT_KIND, formatCents, windowOnApproval } from "@/lib/ads/self-serve";

type NotifyFn = (input: {
  userId: string;
  template: "ad_payment_received" | "ad_approved" | "ad_rejected";
  input: Record<string, string | number | null>;
}) => Promise<unknown>;

export type AdPaymentDeps = {
  supabase: any;
  stripe: Pick<Stripe, "refunds">;
  notify: NotifyFn;
  now?: Date;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function audit(supabase: any, action: string, recordId: string, actorId: string | null, metadata: Record<string, unknown>) {
  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    actor_type: actorId ? "admin" : "system",
    action,
    table_name: "ad_campaigns",
    record_id: recordId,
    metadata: { source: "self_serve_ads", ...metadata }
  });
}

/** Notifications are best-effort: a mail outage must not undo a payment or a review decision. */
async function safeNotify(deps: AdPaymentDeps, payload: Parameters<NotifyFn>[0]) {
  try {
    await deps.notify(payload);
  } catch (error) {
    console.error("Ad notification failed", error instanceof Error ? error.message : error);
  }
}

function dollars(cents: number) {
  return (cents / 100).toFixed(2);
}

/** checkout.session.completed for a self-serve ad. Idempotent. */
export async function applyAdCheckoutCompleted(deps: AdPaymentDeps, session: Stripe.Checkout.Session) {
  if (session.metadata?.kind !== AD_CHECKOUT_KIND) return { handled: false as const };
  const campaignId = session.metadata?.ad_campaign_id ?? "";
  if (!UUID.test(campaignId)) return { handled: true as const, result: "bad_metadata" };
  if (session.payment_status !== "paid") return { handled: true as const, result: "not_paid" };
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  if (!paymentIntentId) return { handled: true as const, result: "no_payment_intent" };

  const { data: campaign, error } = await deps.supabase
    .from("ad_campaigns")
    .select("id,advertiser_id,title,status,price_cents,currency,paid_at,stripe_payment_intent_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (error) throw new Error(`Load ad campaign: ${error.message ?? "failed"}`);
  if (!campaign) return { handled: true as const, result: "unknown_campaign" };

  if (campaign.paid_at) {
    if (campaign.stripe_payment_intent_id === paymentIntentId) return { handled: true as const, result: "duplicate" };
    // A second checkout for an ad that is already paid: refund the extra payment.
    const refund = await deps.stripe.refunds.create(
      { payment_intent: paymentIntentId, reason: "duplicate", metadata: { kind: AD_CHECKOUT_KIND, ad_campaign_id: campaignId } },
      { idempotencyKey: `ad-duplicate-refund:${paymentIntentId}` }
    );
    await audit(deps.supabase, "ad_campaign.duplicate_payment_refunded", campaignId, null, { payment_intent: paymentIntentId, refund: refund.id });
    return { handled: true as const, result: "duplicate_refunded" };
  }

  if (!["draft", "pending_payment"].includes(campaign.status)) return { handled: true as const, result: "ignored_status" };
  if (session.amount_total !== campaign.price_cents || (session.currency ?? "").toLowerCase() !== String(campaign.currency).toLowerCase()) {
    await audit(deps.supabase, "ad_campaign.payment_mismatch", campaignId, null, { amount_total: session.amount_total, currency: session.currency, expected: campaign.price_cents });
    return { handled: true as const, result: "amount_mismatch" };
  }

  const paidAt = (deps.now ?? new Date()).toISOString();
  const updated = await deps.supabase
    .from("ad_campaigns")
    .update({ status: "paid_pending_review", paid_at: paidAt, stripe_payment_intent_id: paymentIntentId, stripe_checkout_session_id: session.id })
    .eq("id", campaignId)
    .in("status", ["draft", "pending_payment"])
    .is("paid_at", null)
    .select("id");
  if (updated.error) throw new Error(`Mark ad paid: ${updated.error.message ?? "failed"}`);
  if (!updated.data?.length) return { handled: true as const, result: "raced" };

  await audit(deps.supabase, "ad_campaign.paid", campaignId, null, { payment_intent: paymentIntentId, amount_cents: campaign.price_cents });
  if (campaign.advertiser_id) {
    await safeNotify(deps, {
      userId: campaign.advertiser_id,
      template: "ad_payment_received",
      input: { adTitle: campaign.title, amount: dollars(campaign.price_cents), currency: String(campaign.currency).toUpperCase(), actionUrl: "/dashboard/ads" }
    });
  }
  return { handled: true as const, result: "paid" };
}

function formatRun(startsAt: string, endsAt: string) {
  const fmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
  return `from ${fmt.format(new Date(startsAt))} to ${fmt.format(new Date(endsAt))} (UTC)`;
}

export async function approveSelfServeAd(deps: AdPaymentDeps, campaignId: string, adminId: string) {
  const now = deps.now ?? new Date();
  const { data: campaign } = await deps.supabase
    .from("ad_campaigns")
    .select("id,advertiser_id,title,status,starts_at,run_days,price_cents,currency,paid_at")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) throw new Error("Ad not found.");
  if (campaign.status !== "paid_pending_review" || !campaign.paid_at) throw new Error("Only paid ads waiting for review can be approved.");
  const window = windowOnApproval(campaign.starts_at, Number(campaign.run_days), now);
  const updated = await deps.supabase
    .from("ad_campaigns")
    .update({ status: window.status, starts_at: window.starts_at, ends_at: window.ends_at, reviewed_at: now.toISOString(), reviewed_by: adminId, rejection_reason: null, updated_by: adminId })
    .eq("id", campaignId)
    .eq("status", "paid_pending_review")
    .select("id");
  if (updated.error || !updated.data?.length) throw new Error(updated.error?.message ?? "The ad changed while you were reviewing it.");
  await audit(deps.supabase, "ad_campaign.approved", campaignId, adminId, { starts_at: window.starts_at, ends_at: window.ends_at });
  if (campaign.advertiser_id) {
    await safeNotify(deps, { userId: campaign.advertiser_id, template: "ad_approved", input: { adTitle: campaign.title, deadline: formatRun(window.starts_at, window.ends_at), actionUrl: "/dashboard/ads" } });
  }
  return window;
}

export async function rejectSelfServeAd(deps: AdPaymentDeps, campaignId: string, adminId: string, reason: string) {
  const trimmed = reason.trim();
  if (!trimmed || trimmed.length > 500) throw new Error("Give the advertiser a reason (up to 500 characters).");
  const now = deps.now ?? new Date();
  const { data: campaign } = await deps.supabase
    .from("ad_campaigns")
    .select("id,advertiser_id,title,status,price_cents,currency,paid_at,stripe_payment_intent_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) throw new Error("Ad not found.");
  if (campaign.status !== "paid_pending_review" || !campaign.stripe_payment_intent_id) throw new Error("Only paid ads waiting for review can be rejected.");
  const refund = await deps.stripe.refunds.create(
    { payment_intent: campaign.stripe_payment_intent_id, metadata: { kind: AD_CHECKOUT_KIND, ad_campaign_id: campaignId } },
    { idempotencyKey: `ad-reject-refund:${campaignId}` }
  );
  const updated = await deps.supabase
    .from("ad_campaigns")
    .update({ status: "rejected", is_active: false, stripe_refund_id: refund.id, rejection_reason: trimmed, reviewed_at: now.toISOString(), reviewed_by: adminId, updated_by: adminId })
    .eq("id", campaignId)
    .eq("status", "paid_pending_review")
    .select("id");
  if (updated.error || !updated.data?.length) throw new Error(updated.error?.message ?? "The ad changed while you were reviewing it.");
  await audit(deps.supabase, "ad_campaign.rejected", campaignId, adminId, { refund: refund.id, reason: trimmed });
  if (campaign.advertiser_id) {
    await safeNotify(deps, {
      userId: campaign.advertiser_id,
      template: "ad_rejected",
      input: { adTitle: campaign.title, reason: trimmed, amount: dollars(campaign.price_cents), currency: String(campaign.currency).toUpperCase(), actionUrl: "/dashboard/ads" }
    });
  }
  return { refundId: refund.id, amount: formatCents(campaign.price_cents, campaign.currency) };
}
