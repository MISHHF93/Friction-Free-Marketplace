export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { formatConnectError, getStoredSellerAccount, sellerStatusCopy, upsertSellerAccountFromStripe } from "@/lib/payments/connect";
import { getStripe } from "@/lib/stripe/server";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const supabase = createAdminClient() as any;

  try {
    const stored = await getStoredSellerAccount(supabase, auth.user.id);
    if (!stored?.stripe_account_id) {
      return NextResponse.json({
        status: "not_started",
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        requirements: { currentlyDue: [], eventuallyDue: [], pastDue: [], pendingVerification: [] },
        message: sellerStatusCopy("not_started"),
        canAcceptPayments: false,
        canReceivePayouts: false
      });
    }

    const account = await getStripe().accounts.retrieve(stored.stripe_account_id);
    if (account.deleted) {
      return NextResponse.json({ error: "The saved Stripe account was deleted. Contact support to reconnect payouts." }, { status: 409 });
    }

    const synced = await upsertSellerAccountFromStripe(supabase, account, auth.user.id);
    if (!synced) return NextResponse.json({ error: "Stripe account ownership validation failed." }, { status: 403 });

    return NextResponse.json({
      accountId: synced.stripe_account_id,
      status: synced.status,
      chargesEnabled: synced.charges_enabled,
      payoutsEnabled: synced.payouts_enabled,
      detailsSubmitted: synced.details_submitted,
      disabledReason: synced.disabled_reason,
      requirements: {
        currentlyDue: synced.requirements_currently_due,
        eventuallyDue: synced.requirements_eventually_due,
        pastDue: synced.requirements_past_due,
        pendingVerification: synced.requirements_pending_verification
      },
      onboardingStartedAt: stored.onboarding_started_at,
      onboardingCompletedAt: synced.onboarding_completed_at,
      lastSyncedAt: synced.last_synced_at,
      message: sellerStatusCopy(synced.status),
      canAcceptPayments: synced.status === "active" && synced.charges_enabled,
      canReceivePayouts: synced.status === "active" && synced.payouts_enabled
    });
  } catch (error) {
    return NextResponse.json({ error: formatConnectError(error) }, { status: 502 });
  }
}
