export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { dollarsToCents } from "@/lib/payments/money";
import { enqueueTemplateNotification } from "@/lib/notifications/service";
import { buildReleaseJournal, postLedgerJournal } from "@/lib/financial/ledger";
import { getStripe } from "@/lib/stripe/server";

const transactionIdSchema = z.string().uuid();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const transactionId = transactionIdSchema.safeParse(id);
  if (!transactionId.success) return NextResponse.json({ error: "Invalid transaction id." }, { status: 400 });

  const supabase = createAdminClient() as any;
  const { data: transaction } = await supabase.from("transactions").select("*").eq("id", transactionId.data).single();
  if (!transaction || ![transaction.buyer_id, transaction.seller_id].includes(auth.user.id)) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  if (auth.user.id !== transaction.buyer_id) return NextResponse.json({ error: "Only the buyer can release held escrow funds." }, { status: 403 });
  if (transaction.status !== "escrowed") return NextResponse.json({ error: "Transaction must be escrowed before release." }, { status: 409 });

  const { data: payment } = await supabase.from("escrow_payments").select("*").eq("transaction_id", transactionId.data).single();
  const { data: sellerAccount } = await supabase.from("seller_payment_accounts").select("stripe_account_id").eq("seller_id", transaction.seller_id).single();
  if (!payment || !sellerAccount) return NextResponse.json({ error: "Payment or seller account not found." }, { status: 404 });
  if (payment.status !== "held") return NextResponse.json({ error: "Payment must be captured and held before release." }, { status: 409 });
  if (!payment.provider_charge_id) return NextResponse.json({ error: "Payment charge is not available for release." }, { status: 409 });

  const transfer = await getStripe().transfers.create({
    amount: dollarsToCents(Number(payment.seller_net_amount)),
    currency: payment.currency.toLowerCase(),
    destination: sellerAccount.stripe_account_id,
    source_transaction: payment.provider_charge_id ?? undefined,
    transfer_group: `transaction_${transactionId.data}`,
    metadata: { transaction_id: transactionId.data, escrow_payment_id: payment.id }
  }, {
    idempotencyKey: request.headers.get("idempotency-key") ?? `release:${transactionId.data}:${payment.id}`
  });

  await supabase.from("payouts").insert({
    transaction_id: transactionId.data,
    seller_id: transaction.seller_id,
    provider: "stripe",
    provider_transfer_id: transfer.id,
    status: "paid",
    amount: Number(payment.seller_net_amount),
    currency: payment.currency,
    paid_at: new Date().toISOString(),
    metadata: { transfer_group: transfer.transfer_group }
  });

  await supabase.from("transaction_receipts").upsert({
    transaction_id: transactionId.data,
    buyer_id: transaction.buyer_id,
    seller_id: transaction.seller_id,
    provider: "stripe",
    provider_payment_id: payment.provider_payment_id,
    provider_charge_id: payment.provider_charge_id,
    subtotal_amount: transaction.item_amount,
    shipping_amount: transaction.shipping_amount,
    tax_amount: transaction.tax_amount,
    platform_fee_amount: payment.platform_fee_amount,
    seller_net_amount: payment.seller_net_amount,
    total_amount: payment.amount,
    currency: payment.currency,
    metadata: { transfer_id: transfer.id }
  });

  await supabase.from("escrow_payments").update({ status: "released", released_at: new Date().toISOString() }).eq("id", payment.id);
  await supabase.from("transactions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", transactionId.data);
  await supabase.from("listings").update({ status: "sold", quantity: 0 }).eq("id", transaction.listing_id);
  await postLedgerJournal(supabase, buildReleaseJournal({
    transactionId: transactionId.data,
    totalAmount: Number(payment.amount),
    sellerNetAmount: Number(payment.seller_net_amount),
    platformFeeAmount: Number(payment.platform_fee_amount),
    currency: payment.currency,
    buyerId: transaction.buyer_id,
    sellerId: transaction.seller_id,
    providerPaymentId: payment.provider_payment_id,
    providerChargeId: payment.provider_charge_id,
    providerTransferId: transfer.id,
  }));

  await recordTransactionEvent(supabase, {
    transaction_id: transactionId.data,
    actor_id: auth.user.id,
    type: "seller_payout_paid",
    from_status: transaction.status,
    to_status: "completed",
    provider_object_id: transfer.id,
    amount: Number(payment.seller_net_amount),
    currency: payment.currency,
    message: "Held funds released to the seller connected account."
  });

  await Promise.all([
    enqueueTemplateNotification({
      userId: transaction.buyer_id,
      template: "payment_released",
      input: { amount: payment.amount, currency: payment.currency, actionUrl: "/dashboard/purchases" },
      payload: { transaction_id: transactionId.data, escrow_payment_id: payment.id, transfer_id: transfer.id },
      supabase
    }),
    enqueueTemplateNotification({
      userId: transaction.seller_id,
      template: "payment_released",
      input: { amount: payment.seller_net_amount, currency: payment.currency, actionUrl: "/dashboard/sales" },
      payload: { transaction_id: transactionId.data, escrow_payment_id: payment.id, transfer_id: transfer.id },
      supabase
    })
  ]);

  return NextResponse.json({ status: "completed", transferId: transfer.id });
}
