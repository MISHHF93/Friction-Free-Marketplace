export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { enqueueTemplateNotification } from "@/lib/notifications/service";
import { releaseHeldEscrow } from "@/lib/payments/release-held";

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
  if (!["escrowed", "shipped", "delivered"].includes(transaction.status)) return NextResponse.json({ error: "Transaction must be escrowed, shipped, or delivered before release." }, { status: 409 });

  const { data: payment } = await supabase.from("escrow_payments").select("*").eq("transaction_id", transactionId.data).single();
  const { data: sellerAccount } = await supabase.from("seller_payment_accounts").select("stripe_account_id").eq("seller_id", transaction.seller_id).single();
  if (!payment || !sellerAccount) return NextResponse.json({ error: "Payment or seller account not found." }, { status: 404 });
  if (payment.status === "released") return NextResponse.json({ status: "completed", alreadyReleased: true });
  if (!["held", "releasing"].includes(payment.status)) return NextResponse.json({ error: "Payment must be captured and held before release." }, { status: 409 });
  if (!payment.provider_charge_id) return NextResponse.json({ error: "Payment charge is not available for release." }, { status: 409 });
  const { data: seller } = await supabase.from("users").select("status").eq("id", transaction.seller_id).maybeSingle();
  if (seller && ["suspended", "banned"].includes(seller.status)) return NextResponse.json({ error: "Payout is frozen while the seller account is restricted." }, { status: 409 });

  const result = await releaseHeldEscrow(supabase, {
    transaction,
    payment,
    sellerAccountId: sellerAccount.stripe_account_id,
    actorId: auth.user.id
  });
  if ("error" in result && result.error) return NextResponse.json({ error: result.error }, { status: result.statusCode });
  if ("alreadyReleased" in result && result.alreadyReleased) return NextResponse.json({ status: "completed", alreadyReleased: true });
  const transfer = { id: (result as { transferId: string }).transferId };
  const transferredAmount = (result as { transferredAmount: number }).transferredAmount;

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
      input: { amount: transferredAmount, currency: payment.currency, actionUrl: "/dashboard/sales" },
      payload: { transaction_id: transactionId.data, escrow_payment_id: payment.id, transfer_id: transfer.id },
      supabase
    })
  ]);

  return NextResponse.json({ status: "completed", transferId: transfer.id });
}
