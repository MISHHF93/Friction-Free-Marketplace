import type Stripe from "stripe";
import { AD_PLACEMENTS, type AdPlacementKey } from "@/lib/ads/placements";
import { AD_CHECKOUT_KIND, buildAdWindow, quoteAdPrice, type AdPricingRow } from "@/lib/ads/self-serve";

export type NewAdInput = {
  placement: AdPlacementKey;
  title: string;
  altText?: string;
  advertiserName: string;
  targetUrl: string;
  imagePath: string;
  startDate: string;
  runDays: number;
};

export type AdCheckoutDeps = {
  supabase: any;
  stripe: Pick<Stripe, "checkout">;
  appUrl: string;
  loadPricing: (placement: AdPlacementKey) => Promise<AdPricingRow | null>;
  now?: Date;
};

type CampaignRow = {
  id: string;
  advertiser_id: string;
  placement: AdPlacementKey;
  title: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  run_days: number;
  price_cents: number;
  currency: string;
  stripe_checkout_session_id: string | null;
  paid_at: string | null;
};

export class AdCheckoutError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const CAMPAIGN_COLUMNS = "id,advertiser_id,placement,title,status,starts_at,ends_at,run_days,price_cents,currency,stripe_checkout_session_id,paid_at";

export function adImagePathBelongsTo(path: string, userId: string) {
  return path.startsWith(`advertisers/${userId}/`) && !path.includes("..") && path.length <= 500;
}

export function adCheckoutSessionParams(campaign: CampaignRow, email: string | null, appUrl: string, now: Date): Stripe.Checkout.SessionCreateParams {
  const base = appUrl.replace(/\/$/, "");
  const metadata = { kind: AD_CHECKOUT_KIND, ad_campaign_id: campaign.id, advertiser_id: campaign.advertiser_id };
  const startDay = campaign.starts_at.slice(0, 10);
  return {
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: email ?? undefined,
    client_reference_id: campaign.id,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: campaign.currency,
        unit_amount: campaign.price_cents,
        product_data: {
          name: `Sponsored placement: ${AD_PLACEMENTS[campaign.placement].name}`,
          description: `${campaign.run_days}-day run from ${startDay}. Reviewed before it goes live; refunded in full if not approved.`
        }
      }
    }],
    metadata,
    payment_intent_data: { metadata, description: `Friction-Free sponsored placement ${campaign.id}` },
    success_url: `${base}/dashboard/ads?checkout=success&ad=${campaign.id}`,
    cancel_url: `${base}/dashboard/ads?checkout=cancelled&ad=${campaign.id}`,
    expires_at: Math.floor(now.valueOf() / 1000) + 60 * 60
  };
}

async function openSession(deps: AdCheckoutDeps, campaign: CampaignRow, email: string | null, idempotencyKey: string) {
  const now = deps.now ?? new Date();
  const session = await deps.stripe.checkout.sessions.create(
    adCheckoutSessionParams(campaign, email, deps.appUrl, now),
    { idempotencyKey }
  );
  if (!session.url) throw new AdCheckoutError("Stripe did not return a checkout link.", 502);
  const updated = await deps.supabase
    .from("ad_campaigns")
    .update({ status: "pending_payment", stripe_checkout_session_id: session.id, submitted_at: now.toISOString() })
    .eq("id", campaign.id)
    .in("status", ["draft", "pending_payment"])
    .is("paid_at", null)
    .select("id");
  if (updated.error || !updated.data?.length) throw new AdCheckoutError("Could not start checkout for this ad.", 409);
  return { url: session.url, campaignId: campaign.id };
}

export async function startNewAdCheckout(deps: AdCheckoutDeps, user: { id: string; email: string | null }, input: NewAdInput, requestKey: string) {
  const now = deps.now ?? new Date();
  const existing = await deps.supabase.from("ad_campaigns").select(CAMPAIGN_COLUMNS).eq("advertiser_id", user.id).eq("client_request_id", requestKey).maybeSingle();
  if (existing.data) return resumeAdCheckout(deps, user, existing.data.id, requestKey);

  if (!adImagePathBelongsTo(input.imagePath, user.id)) throw new AdCheckoutError("Upload the ad image again.");
  const pricing = await deps.loadPricing(input.placement);
  if (!pricing) throw new AdCheckoutError("This placement is not available right now.", 409);
  let priceCents: number;
  let window: { starts_at: string; ends_at: string };
  try {
    priceCents = quoteAdPrice(pricing, input.runDays);
    window = buildAdWindow(input.startDate, input.runDays, now);
  } catch (error) {
    throw new AdCheckoutError(error instanceof Error ? error.message : "Check the ad details.");
  }

  const inserted = await deps.supabase.from("ad_campaigns").insert({
    source: "self_serve",
    status: "draft",
    advertiser_id: user.id,
    placement: input.placement,
    title: input.title,
    alt_text: input.altText?.trim() || input.title,
    advertiser_name: input.advertiserName,
    target_url: input.targetUrl,
    image_path: input.imagePath,
    starts_at: window.starts_at,
    ends_at: window.ends_at,
    run_days: input.runDays,
    price_cents: priceCents,
    currency: pricing.currency,
    is_active: true,
    priority: 0,
    weight: 1,
    client_request_id: requestKey,
    created_by: user.id,
    updated_by: user.id
  }).select(CAMPAIGN_COLUMNS).single();
  if (inserted.error || !inserted.data) throw new AdCheckoutError("Could not save the ad.", 500);
  return openSession(deps, inserted.data as CampaignRow, user.email, `ad-checkout:${inserted.data.id}:${requestKey}`);
}

export async function resumeAdCheckout(deps: AdCheckoutDeps, user: { id: string; email: string | null }, campaignId: string, requestKey: string) {
  const now = deps.now ?? new Date();
  const loaded = await deps.supabase.from("ad_campaigns").select(CAMPAIGN_COLUMNS).eq("id", campaignId).eq("advertiser_id", user.id).maybeSingle();
  const campaign = loaded.data as CampaignRow | null;
  if (!campaign) throw new AdCheckoutError("Ad not found.", 404);
  if (campaign.paid_at || !["draft", "pending_payment"].includes(campaign.status)) {
    return { url: `${deps.appUrl.replace(/\/$/, "")}/dashboard/ads?ad=${campaign.id}`, campaignId: campaign.id, alreadyPaid: true };
  }
  if (campaign.stripe_checkout_session_id) {
    const session = await deps.stripe.checkout.sessions.retrieve(campaign.stripe_checkout_session_id);
    if (session.status === "open" && session.url) return { url: session.url, campaignId: campaign.id };
    if (session.status === "complete") {
      return { url: `${deps.appUrl.replace(/\/$/, "")}/dashboard/ads?checkout=success&ad=${campaign.id}`, campaignId: campaign.id, alreadyPaid: true };
    }
  }
  // The old session expired. Re-price and shift the window if the start has passed.
  const pricing = await deps.loadPricing(campaign.placement);
  if (!pricing) throw new AdCheckoutError("This placement is not available right now.", 409);
  let priceCents: number;
  let window: { starts_at: string; ends_at: string };
  try {
    priceCents = quoteAdPrice(pricing, campaign.run_days);
    const start = new Date(campaign.starts_at);
    const startDate = (start < now ? now : start).toISOString().slice(0, 10);
    window = buildAdWindow(startDate, campaign.run_days, now);
  } catch (error) {
    throw new AdCheckoutError(error instanceof Error ? error.message : "Check the ad details.");
  }
  const refreshed = await deps.supabase.from("ad_campaigns")
    .update({ price_cents: priceCents, currency: pricing.currency, starts_at: window.starts_at, ends_at: window.ends_at, updated_by: user.id })
    .eq("id", campaign.id).in("status", ["draft", "pending_payment"]).is("paid_at", null)
    .select(CAMPAIGN_COLUMNS).single();
  if (refreshed.error || !refreshed.data) throw new AdCheckoutError("Could not update the ad.", 409);
  return openSession(deps, refreshed.data as CampaignRow, user.email, `ad-checkout:${campaign.id}:${requestKey}`);
}
