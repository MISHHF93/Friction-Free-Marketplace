import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { claimTransactionStatus } from "@/lib/payments/escrow";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { notifyTransactionParties } from "@/lib/notifications/transaction-events";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  carrier: z.string().trim().min(2).max(80),
  trackingNumber: z.string().trim().min(4).max(80)
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const payload = bodySchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Carrier and tracking number are required." }, { status: 400 });

  const supabase = createAdminClient() as any;
  const { data: transaction } = await supabase.from("transactions").select("id,seller_id,buyer_id,status").eq("id", id).maybeSingle();
  if (!transaction || transaction.seller_id !== auth.user.id) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  if (transaction.status !== "escrowed") return NextResponse.json({ error: "Only held orders can be shipped." }, { status: 409 });
  const { data: payment } = await supabase.from("escrow_payments").select("status").eq("transaction_id", id).maybeSingle();
  if (payment?.status !== "held") return NextResponse.json({ error: "Shipping starts after the payment is held." }, { status: 409 });

  const shipped = await claimTransactionStatus(supabase, id, "escrowed", "shipped", {
    carrier: payload.data.carrier,
    tracking_number: payload.data.trackingNumber,
    shipped_at: new Date().toISOString()
  });
  if (!shipped) return NextResponse.json({ error: "This order was already updated." }, { status: 409 });
  await recordTransactionEvent(supabase, {
    transaction_id: id,
    actor_id: auth.user.id,
    type: "shipped",
    from_status: "escrowed",
    to_status: "shipped",
    message: `${payload.data.carrier} ${payload.data.trackingNumber}`
  });
  await notifyTransactionParties(supabase, { transactionId: id, template: "order_shipped", to: ["buyer"], input: { carrier: payload.data.carrier, trackingNumber: payload.data.trackingNumber } });
  return NextResponse.json({ status: "shipped" });
}
