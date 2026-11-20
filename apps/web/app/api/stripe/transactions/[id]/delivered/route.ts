import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { claimTransactionStatus } from "@/lib/payments/escrow";
import { recordTransactionEvent } from "@/lib/payments/audit";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const supabase = createAdminClient() as any;
  const { data: transaction } = await supabase.from("transactions").select("id,seller_id,buyer_id,status").eq("id", id).maybeSingle();
  if (!transaction || ![transaction.buyer_id, transaction.seller_id].includes(auth.user.id)) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }
  if (transaction.status !== "shipped") return NextResponse.json({ error: "Only shipped orders can be marked delivered." }, { status: 409 });

  const delivered = await claimTransactionStatus(supabase, id, "shipped", "delivered", { delivered_at: new Date().toISOString() });
  if (!delivered) return NextResponse.json({ error: "This order was already updated." }, { status: 409 });
  await recordTransactionEvent(supabase, {
    transaction_id: id,
    actor_id: auth.user.id,
    type: "delivered",
    from_status: "shipped",
    to_status: "delivered",
    message: "The order was marked delivered."
  });
  return NextResponse.json({ status: "delivered" });
}
