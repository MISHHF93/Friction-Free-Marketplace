import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env.server";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { getStripe } from "@/lib/stripe/server";

export type SellerConnectStatus = "not_started" | "onboarding" | "pending" | "active" | "restricted";

const SELLER_ACCOUNT_SELECT = [
  "seller_id",
  "provider",
  "stripe_account_id",
  "status",
  "charges_enabled",
  "payouts_enabled",
  "details_submitted",
  "disabled_reason",
  "requirements_currently_due",
  "requirements_eventually_due",
  "requirements_past_due",
  "requirements_pending_verification",
  "onboarding_started_at",
  "onboarding_completed_at",
  "last_synced_at",
  "metadata",
  "created_at",
  "updated_at"
].join(",");

export function mapStripeAccountStatus(account: Stripe.Account): SellerConnectStatus {
  if (account.charges_enabled && account.payouts_enabled) return "active";
  if (account.requirements?.disabled_reason || (account.requirements?.past_due?.length ?? 0) > 0) return "restricted";
  if (account.details_submitted || (account.requirements?.pending_verification?.length ?? 0) > 0) return "pending";
  return "onboarding";
}

export function formatConnectError(error: unknown) {
  if (typeof error === "object" && error && "type" in error && "message" in error) {
    const stripeError = error as { type?: string; message?: string };
    return stripeError.message ?? stripeError.type ?? "Stripe Connect request failed.";
  }

  return error instanceof Error ? error.message : "Stripe Connect request failed.";
}

function connectMetadata(account: Stripe.Account) {
  return {
    business_type: account.business_type,
    controller: account.controller,
    default_currency: account.default_currency,
    livemode: (account as Stripe.Account & { livemode?: boolean }).livemode ?? false,
    country: account.country,
    capabilities: account.capabilities,
    future_requirements: account.future_requirements ?? null
  };
}

export function serializeSellerAccount(account: Stripe.Account) {
  const status = mapStripeAccountStatus(account);
  return {
    provider: "stripe",
    stripe_account_id: account.id,
    status,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
    disabled_reason: account.requirements?.disabled_reason ?? null,
    requirements_currently_due: account.requirements?.currently_due ?? [],
    requirements_eventually_due: account.requirements?.eventually_due ?? [],
    requirements_past_due: account.requirements?.past_due ?? [],
    requirements_pending_verification: account.requirements?.pending_verification ?? [],
    onboarding_completed_at: status === "active" ? new Date().toISOString() : null,
    last_synced_at: new Date().toISOString(),
    metadata: connectMetadata(account)
  };
}

export async function upsertSellerAccountFromStripe(
  supabase: SupabaseClient<any>,
  account: Stripe.Account,
  fallbackSellerId?: string | null
) {
  let sellerId = typeof account.metadata?.seller_id === "string" ? account.metadata.seller_id : fallbackSellerId ?? null;

  if (!sellerId) {
    const { data: existing } = await supabase
      .from("seller_payment_accounts")
      .select("seller_id")
      .eq("stripe_account_id", account.id)
      .maybeSingle();
    sellerId = existing?.seller_id ?? null;
  }

  if (!sellerId) return null;

  const serialized = serializeSellerAccount(account);
  const { data: existing } = await supabase
    .from("seller_payment_accounts")
    .select("status,onboarding_completed_at")
    .eq("seller_id", sellerId)
    .maybeSingle();

  const onboardingCompletedAt = serialized.status === "active"
    ? existing?.onboarding_completed_at ?? serialized.onboarding_completed_at
    : existing?.onboarding_completed_at ?? null;

  await supabase.from("seller_payment_accounts").upsert({
    seller_id: sellerId,
    ...serialized,
    onboarding_completed_at: onboardingCompletedAt
  });

  if (serialized.status === "active" && existing?.status !== "active") {
    await recordTransactionEvent(supabase, {
      actor_id: sellerId,
      type: "seller_onboarding_completed",
      provider_object_id: account.id,
      message: "Seller completed Stripe Connect onboarding."
    });
  }

  return { sellerId, ...serialized, onboarding_completed_at: onboardingCompletedAt };
}

export async function getStoredSellerAccount(supabase: SupabaseClient<any>, sellerId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from("seller_payment_accounts")
    .select(SELLER_ACCOUNT_SELECT)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createExpressAccountForSeller(seller: { id: string; email?: string | null }) {
  const stripe = getStripe();

  return stripe.accounts.create(
    {
      type: "express",
      country: "US",
      email: seller.email ?? undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_type: "individual",
      metadata: { seller_id: seller.id },
      settings: {
        payouts: {
          schedule: { interval: "manual" }
        }
      }
    },
    { idempotencyKey: `connect-account:${seller.id}` }
  );
}

export function createAccountLink(accountId: string, purpose: "onboarding" | "update" = "onboarding") {
  return getStripe().accountLinks.create({
    account: accountId,
    type: purpose === "update" ? "account_update" : "account_onboarding",
    refresh_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/payments?onboarding=refresh`,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/payments?onboarding=return`
  });
}

export function sellerStatusCopy(status: SellerConnectStatus) {
  switch (status) {
    case "active":
      return "Payments and payouts are enabled.";
    case "pending":
      return "Stripe is reviewing submitted information. You can sell once payouts and charges are enabled.";
    case "restricted":
      return "Additional information is required before this seller can accept marketplace payments.";
    case "onboarding":
      return "Finish Stripe-hosted onboarding to enable marketplace checkout and payouts.";
    default:
      return "Create a Stripe Express account to begin seller onboarding.";
  }
}
