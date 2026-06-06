export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { calculatePlatformFeeCents, centsToDollars, dollarsToCents, normalizeCurrency } from "@/lib/payments/money";
import { getStripe } from "@/lib/stripe/server";

const paymentIntentRequestSchema = z.object({
  listingId: z.string().uuid(),
  reservationDepositCents: z.number().int().min(0).optional(),
  shippingCents: z.number().int().min(0).default(0),
  taxCents: z.number().int().min(0).default(0)
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const payload = paymentIntentRequestSchema.safeParse(await request.json());
  if (!payload.success) return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });

  const supabase = createAdminClient() as any;
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id,title,seller_id,price_amount,currency,status,quantity")
    .eq("id", payload.data.listingId)
    .is("deleted_at", null)
    .single();

  if (listingError || !listing || listing.status !== "active" || listing.quantity < 1) {
    return NextResponse.json({ error: "Listing is not available for checkout." }, { status: 404 });
  }

  if (listing.seller_id === auth.user.id) {
    return NextResponse.json({ error: "Sellers cannot buy their own listings." }, { status: 400 });
  }

  const { data: sellerAccount } = await supabase
    .from("seller_payment_accounts")
    .select("stripe_account_id,status,charges_enabled,payouts_enabled")
    .eq("seller_id", listing.seller_id)
    .maybeSingle();

  if (!sellerAccount?.stripe_account_id || sellerAccount.status !== "active") {
    return NextResponse.json({ error: "Seller has not completed Stripe Connect onboarding." }, { status: 409 });
  }

  const itemCents = payload.data.reservationDepositCents && payload.data.reservationDepositCents > 0
    ? payload.data.reservationDepositCents
    : dollarsToCents(Number(listing.price_amount));
  const platformFeeCents = calculatePlatformFeeCents(itemCents + payload.data.shippingCents + payload.data.taxCents);
  const totalCents = itemCents + payload.data.shippingCents + payload.data.taxCents + platformFeeCents;
  const currency = normalizeCurrency(listing.currency);

  const { data: transaction, error: transactionError } = await supabase.from("transactions").insert({
    listing_id: listing.id,
    buyer_id: auth.user.id,
    seller_id: listing.seller_id,
    status: "pending_payment",
    item_amount: centsToDollars(itemCents),
    shipping_amount: centsToDollars(payload.data.shippingCents),
    tax_amount: centsToDollars(payload.data.taxCents),
    marketplace_fee_amount: centsToDollars(platformFeeCents),
    currency: currency.toUpperCase(),
    metadata: {
      checkout_kind: payload.data.reservationDepositCents ? "reservation_deposit" : "full_purchase",
      seller_stripe_account_id: sellerAccount.stripe_account_id
    }
  }).select("*").single();

  if (transactionError || !transaction) return NextResponse.json({ error: "Could not create transaction." }, { status: 500 });

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency,
    capture_method: "manual",
    automatic_payment_methods: { enabled: true },
    description: `Friction-Free Marketplace purchase: ${listing.title}`,
    metadata: {
      transaction_id: transaction.id,
      listing_id: listing.id,
      buyer_id: auth.user.id,
      seller_id: listing.seller_id,
      platform_fee_cents: String(platformFeeCents),
      seller_net_cents: String(totalCents - platformFeeCents)
    },
    transfer_group: `transaction_${transaction.id}`
  });

  await supabase.from("escrow_payments").insert({
    transaction_id: transaction.id,
    provider: "stripe",
    provider_payment_id: paymentIntent.id,
    status: paymentIntent.status === "requires_capture" ? "authorized" : "requires_action",
    amount: centsToDollars(totalCents),
    currency: currency.toUpperCase(),
    platform_fee_amount: centsToDollars(platformFeeCents),
    seller_net_amount: centsToDollars(totalCents - platformFeeCents),
    capture_before: (paymentIntent as unknown as { capture_before?: number }).capture_before ? new Date((paymentIntent as unknown as { capture_before: number }).capture_before * 1000).toISOString() : null,
    metadata: { client_secret_last4: paymentIntent.client_secret?.slice(-4) }
  });

  await recordTransactionEvent(supabase, {
    transaction_id: transaction.id,
    actor_id: auth.user.id,
    type: "payment_intent_created",
    to_status: "pending_payment",
    provider_object_id: paymentIntent.id,
    amount: centsToDollars(totalCents),
    currency,
    message: "Manual-capture PaymentIntent created. Funds will be authorized before capture."
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    transactionId: transaction.id,
    amount: totalCents,
    currency,
    platformFee: platformFeeCents,
    captureMethod: "manual"
  });
}
