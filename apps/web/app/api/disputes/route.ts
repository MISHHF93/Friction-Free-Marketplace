import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to open a dispute." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const transactionId = String(body.transactionId ?? "");
  const reason = String(body.reason ?? "").trim();
  if (!transactionId || reason.length < 10) {
    return NextResponse.json({ error: "An order and a description of at least 10 characters are required." }, { status: 400 });
  }

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .select("id,buyer_id,seller_id,status")
    .eq("id", transactionId)
    .maybeSingle();
  if (transactionError || !transaction) {
    return NextResponse.json({ error: "That order was not found for this account." }, { status: 404 });
  }
  if (transaction.buyer_id !== user.id && transaction.seller_id !== user.id) {
    return NextResponse.json({ error: "You can only dispute your own orders." }, { status: 403 });
  }

  const { error } = await supabase.from("disputes").insert({
    transaction_id: transaction.id,
    opened_by_id: user.id,
    reason: reason.slice(0, 120),
    description: reason,
    status: "opened"
  });
  if (error) return NextResponse.json({ error: "That dispute could not be opened." }, { status: 422 });

  await supabase.from("transactions").update({ status: "disputed" }).eq("id", transaction.id);
  return NextResponse.json({ ok: true, message: "Dispute opened. The order is marked disputed and no new charge was made." });
}
