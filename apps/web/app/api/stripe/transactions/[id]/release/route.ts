import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { dollarsToCents } from "@/lib/payments/money";
import { getStripe } from "@/lib/stripe/server";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const supabase = createAdminClient() as any;
  const { data: transaction } = await supabase.from("transactions").select("*").eq("id", params.id).single();
  if (!transaction || ![transaction.buyer_id, transaction.seller_id].includes(auth.user.id)) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });

  const { data: payment } = await supabase.from("escrow_payments").select("*").eq("transaction_id", params.id).single();
  const { data: sellerAccount } = await supabase.from("seller_payment_accounts").select("stripe_account_id").eq("seller_id", transaction.seller_id).single();
  if (!payment || !sellerAccount) return NextResponse.json({ error: "Payment or seller account not found." }, { status: 404 });
  if (payment.status !== "held") return NextResponse.json({ error: "Payment must be captured and held before release." }, { status: 409 });

  const transfer = await getStripe().transfers.create({
    amount: dollarsToCents(Number(payment.seller_net_amount)),
    currency: payment.currency.toLowerCase(),
    destination: sellerAccount.stripe_account_id,
    source_transaction: payment.provider_charge_id ?? undefined,
    transfer_group: `transaction_${params.id}`,
    metadata: { transaction_id: params.id, escrow_payment_id: payment.id }
  });

  await supabase.from("payouts").insert({
    transaction_id: params.id,
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
    transaction_id: params.id,
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
  await supabase.from("transactions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", params.id);
  await supabase.from("listings").update({ status: "sold", quantity: 0 }).eq("id", transaction.listing_id);

  await recordTransactionEvent(supabase, {
    transaction_id: params.id,
    actor_id: auth.user.id,
    type: "seller_payout_paid",
    from_status: transaction.status,
    to_status: "completed",
    provider_object_id: transfer.id,
    amount: Number(payment.seller_net_amount),
    currency: payment.currency,
    message: "Held funds released to the seller connected account."
  });

  return NextResponse.json({ status: "completed", transferId: transfer.id });
}
