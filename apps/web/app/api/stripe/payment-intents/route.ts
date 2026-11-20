export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { centsToDollars, normalizeCurrency } from "@/lib/payments/money";
import { openCheckoutStatuses } from "@/lib/payments/open-checkout";
import { clientChargesMatchQuote, quoteCheckoutAmounts } from "@/lib/payments/quote";
import { checkoutStripeIdempotencyKey, parseIdempotencyKey } from "@/lib/payments/idempotency";
import { enqueueTemplateNotification } from "@/lib/notifications/service";
import { getStripe } from "@/lib/stripe/server";
import { isTrustedMutationOrigin } from "@/lib/security/request-origin";

const paymentIntentRequestSchema = z.object({
  listingId: z.string().uuid(),
  offerId: z.string().uuid().optional(),
  shippingCents: z.number().int().min(0).max(25_000_00).optional(),
  taxCents: z.number().int().min(0).max(25_000_00).optional()
});

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const idempotencyKey = parseIdempotencyKey(request.headers.get("idempotency-key"));
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: "A valid Idempotency-Key header is required for checkout." },
      { status: 400 }
    );
  }

  const payload = paymentIntentRequestSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });

  const supabase = createAdminClient() as any;
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id,title,seller_id,price_amount,currency,status,quantity,metadata")
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

  if (!sellerAccount?.stripe_account_id || sellerAccount.status !== "active" || !sellerAccount.charges_enabled) {
    return NextResponse.json({ error: "Seller has not completed Stripe Connect onboarding." }, { status: 409 });
  }

  let offer: { id: string; amount: number; currency: string } | null = null;
  if (payload.data.offerId) {
    const { data: acceptedOffer, error: offerError } = await supabase
      .from("offers")
      .select("id,amount,currency,status,buyer_id,listing_id,expires_at")
      .eq("id", payload.data.offerId)
      .maybeSingle();
    if (offerError) return NextResponse.json({ error: "Could not load the accepted offer." }, { status: 500 });
    const expired = acceptedOffer?.expires_at && new Date(acceptedOffer.expires_at).getTime() <= Date.now();
    if (!acceptedOffer || acceptedOffer.status !== "accepted" || acceptedOffer.buyer_id !== auth.user.id || acceptedOffer.listing_id !== listing.id || expired) {
      return NextResponse.json({ error: "That accepted offer cannot be paid." }, { status: 409 });
    }
    offer = acceptedOffer;
  }

  const quote = quoteCheckoutAmounts({
    priceAmount: Number(listing.price_amount),
    itemAmount: offer ? Number(offer.amount) : undefined,
    metadata: listing.metadata
  });
  if (!clientChargesMatchQuote(quote, payload.data)) {
    return NextResponse.json({
      error: "Shipping or tax does not match the server quote.",
      shippingCents: quote.shippingCents,
      taxCents: quote.taxCents
    }, { status: 400 });
  }
  const platformFeeCents = quote.platformFeeCents;
  const totalCents = quote.totalCents;
  const currency = normalizeCurrency(listing.currency);

  const expectedAmounts = {
    item: quote.itemAmount,
    shipping: quote.shippingAmount,
    tax: quote.taxAmount,
    fee: quote.platformFeeAmount,
  };
  const { data: openSale, error: openSaleError } = await supabase
    .from("transactions")
    .select("id,buyer_id,idempotency_key")
    .eq("listing_id", listing.id)
    .in("status", [...openCheckoutStatuses])
    .limit(1)
    .maybeSingle();
  if (openSaleError) return NextResponse.json({ error: "Could not check listing availability." }, { status: 500 });
  if (openSale && openSale.idempotency_key !== idempotencyKey) {
    return NextResponse.json({ error: "This listing already has an open checkout." }, { status: 409 });
  }
  let { data: transaction } = await supabase
    .from("transactions")
    .select("*")
    .eq("buyer_id", auth.user.id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (transaction) {
    const sameRequest = transaction.listing_id === listing.id
      && Number(transaction.item_amount) === expectedAmounts.item
      && Number(transaction.shipping_amount) === expectedAmounts.shipping
      && Number(transaction.tax_amount) === expectedAmounts.tax
      && Number(transaction.marketplace_fee_amount) === expectedAmounts.fee;
    if (!sameRequest) {
      return NextResponse.json(
        { error: "This checkout key was already used for a different request." },
        { status: 409 }
      );
    }

    const { data: existingPayment } = await supabase
      .from("escrow_payments")
      .select("provider_payment_id")
      .eq("transaction_id", transaction.id)
      .maybeSingle();
    if (existingPayment?.provider_payment_id) {
      const existingIntent = await getStripe().paymentIntents.retrieve(existingPayment.provider_payment_id);
      return NextResponse.json({
        clientSecret: existingIntent.client_secret,
        paymentIntentId: existingIntent.id,
        transactionId: transaction.id,
        amount: existingIntent.amount,
        currency: existingIntent.currency,
        platformFee: platformFeeCents,
        captureMethod: "manual",
        duplicate: true
      });
    }
  } else {
    const inserted = await supabase.from("transactions").insert({
      listing_id: listing.id,
      buyer_id: auth.user.id,
      seller_id: listing.seller_id,
      status: "pending_payment",
      item_amount: expectedAmounts.item,
      shipping_amount: expectedAmounts.shipping,
      tax_amount: expectedAmounts.tax,
      marketplace_fee_amount: expectedAmounts.fee,
      currency: currency.toUpperCase(),
      offer_id: offer?.id ?? null,
      idempotency_key: idempotencyKey,
      metadata: {
        checkout_kind: offer ? "accepted_offer" : "full_purchase",
        offer_id: offer?.id ?? null,
        seller_stripe_account_id: sellerAccount.stripe_account_id
      }
    }).select("*").single();
    transaction = inserted.data;

    if (inserted.error?.code === "23505") {
      const raced = await supabase
        .from("transactions")
        .select("*")
        .eq("buyer_id", auth.user.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (!raced.data) {
        return NextResponse.json({ error: "This listing already has an open checkout." }, { status: 409 });
      }
      transaction = raced.data;
    }
    if (!transaction) return NextResponse.json({ error: "Could not create transaction." }, { status: 500 });
  }

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create(
    {
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
    },
    { idempotencyKey: checkoutStripeIdempotencyKey(auth.user.id, idempotencyKey) }
  );

  await supabase.from("escrow_payments").upsert({
    transaction_id: transaction.id,
    provider: "stripe",
    provider_payment_id: paymentIntent.id,
    status: paymentIntent.status === "requires_capture" ? "authorized" : "requires_action",
    amount: centsToDollars(totalCents),
    currency: currency.toUpperCase(),
    platform_fee_amount: centsToDollars(platformFeeCents),
    seller_net_amount: centsToDollars(totalCents - platformFeeCents),
    capture_before: (paymentIntent as unknown as { capture_before?: number }).capture_before ? new Date((paymentIntent as unknown as { capture_before: number }).capture_before * 1000).toISOString() : null,
    metadata: { client_secret_last4: paymentIntent.client_secret?.slice(-4), checkout_idempotency_key: idempotencyKey }
  }, { onConflict: "transaction_id" });

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

  await Promise.all([
    enqueueTemplateNotification({
      userId: auth.user.id,
      template: "payment_authorized",
      input: { listingTitle: listing.title, amount: centsToDollars(totalCents), currency: currency.toUpperCase(), actionUrl: "/dashboard/purchases" },
      payload: { transaction_id: transaction.id, listing_id: listing.id, payment_intent_id: paymentIntent.id },
      supabase
    }),
    enqueueTemplateNotification({
      userId: listing.seller_id,
      template: "payment_authorized",
      input: { listingTitle: listing.title, amount: centsToDollars(totalCents), currency: currency.toUpperCase(), actionUrl: "/dashboard/sales" },
      payload: { transaction_id: transaction.id, listing_id: listing.id, payment_intent_id: paymentIntent.id },
      supabase
    })
  ]);

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
