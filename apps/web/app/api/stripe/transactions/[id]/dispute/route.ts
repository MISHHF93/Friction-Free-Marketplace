export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { recordTransactionEvent } from "@/lib/payments/audit";

const disputeSchema = z.object({ reason: z.string().min(10), evidence: z.record(z.unknown()).default({}) });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const payload = disputeSchema.safeParse(await request.json());
  if (!payload.success) return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });

  const supabase = createAdminClient() as any;
  const { data: transaction } = await supabase.from("transactions").select("*").eq("id", params.id).single();
  if (!transaction || ![transaction.buyer_id, transaction.seller_id].includes(auth.user.id)) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });

  const { data: dispute, error } = await supabase.from("disputes").insert({
    transaction_id: params.id,
    opened_by_id: auth.user.id,
    respondent_id: auth.user.id === transaction.buyer_id ? transaction.seller_id : transaction.buyer_id,
    reason: payload.data.reason,
    status: "opened",
    evidence: payload.data.evidence
  }).select("*").single();
  if (error) return NextResponse.json({ error: "Could not create dispute." }, { status: 500 });

  await supabase.from("transactions").update({ status: "disputed" }).eq("id", params.id);
  await recordTransactionEvent(supabase, {
    transaction_id: params.id,
    actor_id: auth.user.id,
    type: "dispute_opened",
    from_status: transaction.status,
    to_status: "disputed",
    provider_object_id: dispute.id,
    message: payload.data.reason
  });

  return NextResponse.json({ status: "disputed", disputeId: dispute.id });
}
