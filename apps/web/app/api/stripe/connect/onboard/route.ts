export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { env } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { getStripe } from "@/lib/stripe/server";

function mapAccountStatus(account: { charges_enabled?: boolean; payouts_enabled?: boolean; details_submitted?: boolean; requirements?: { disabled_reason?: string | null } | null }) {
  if (account.charges_enabled && account.payouts_enabled) return "active";
  if (account.requirements?.disabled_reason) return "restricted";
  if (account.details_submitted) return "pending";
  return "onboarding";
}

export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const stripe = getStripe();
  const supabase = createAdminClient() as any;
  const { data: existing } = await supabase.from("seller_payment_accounts").select("stripe_account_id").eq("seller_id", auth.user.id).maybeSingle();

  const account = existing?.stripe_account_id
    ? await stripe.accounts.retrieve(existing.stripe_account_id)
    : await stripe.accounts.create({
        type: "express",
        country: "US",
        email: auth.user.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        business_type: "individual",
        metadata: { seller_id: auth.user.id }
      });

  const requirements = account.requirements;
  await supabase.from("seller_payment_accounts").upsert({
    seller_id: auth.user.id,
    provider: "stripe",
    stripe_account_id: account.id,
    status: mapAccountStatus(account),
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
    disabled_reason: requirements?.disabled_reason ?? null,
    requirements_currently_due: requirements?.currently_due ?? [],
    requirements_eventually_due: requirements?.eventually_due ?? [],
    onboarding_started_at: new Date().toISOString(),
    onboarding_completed_at: account.charges_enabled && account.payouts_enabled ? new Date().toISOString() : null,
    metadata: { default_currency: account.default_currency, livemode: (account as { livemode?: boolean }).livemode ?? false }
  });

  await recordTransactionEvent(supabase, {
    actor_id: auth.user.id,
    type: "seller_onboarding_started",
    provider_object_id: account.id,
    message: "Seller started Stripe Connect onboarding."
  });

  const link = await stripe.accountLinks.create({
    account: account.id,
    type: "account_onboarding",
    refresh_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/payments?onboarding=refresh`,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/payments?onboarding=return`
  });

  return NextResponse.json({ url: link.url, accountId: account.id, status: mapAccountStatus(account) });
}
