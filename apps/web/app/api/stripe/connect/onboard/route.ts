export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { recordTransactionEvent } from "@/lib/payments/audit";
import {
  createAccountLink,
  createExpressAccountForSeller,
  formatConnectError,
  getStoredSellerAccount,
  mapStripeAccountStatus,
  serializeSellerAccount
} from "@/lib/payments/connect";
import { getStripe } from "@/lib/stripe/server";

export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const supabase = createAdminClient() as any;

  try {
    const stored = await getStoredSellerAccount(supabase, auth.user.id);
    const stripe = getStripe();
    const account = stored?.stripe_account_id
      ? await stripe.accounts.retrieve(stored.stripe_account_id)
      : await createExpressAccountForSeller({ id: auth.user.id, email: auth.user.email });

    if (account.deleted) {
      return NextResponse.json({ error: "The saved Stripe account was deleted. Contact support to reconnect payouts." }, { status: 409 });
    }

    if (account.metadata?.seller_id && account.metadata.seller_id !== auth.user.id) {
      return NextResponse.json({ error: "Stripe account ownership validation failed." }, { status: 403 });
    }

    if (!account.metadata?.seller_id) {
      await stripe.accounts.update(account.id, { metadata: { ...account.metadata, seller_id: auth.user.id } });
    }

    const serialized = serializeSellerAccount(account);
    await supabase.from("seller_payment_accounts").upsert({
      seller_id: auth.user.id,
      ...serialized,
      onboarding_started_at: stored?.onboarding_started_at ?? new Date().toISOString(),
      onboarding_completed_at: serialized.status === "active" ? stored?.onboarding_completed_at ?? serialized.onboarding_completed_at : stored?.onboarding_completed_at ?? null
    });

    await recordTransactionEvent(supabase, {
      actor_id: auth.user.id,
      type: "seller_onboarding_started",
      provider_object_id: account.id,
      message: stored?.stripe_account_id ? "Seller resumed Stripe Connect onboarding." : "Seller started Stripe Connect onboarding."
    });

    const link = await createAccountLink(account.id, mapStripeAccountStatus(account) === "active" ? "update" : "onboarding");

    return NextResponse.json({
      url: link.url,
      accountId: account.id,
      status: mapStripeAccountStatus(account),
      expiresAt: link.expires_at
    });
  } catch (error) {
    return NextResponse.json({ error: formatConnectError(error) }, { status: 502 });
  }
}
