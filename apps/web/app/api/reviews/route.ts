import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to write a review." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const transactionId = String(body.transactionId ?? "");
  const rating = Number(body.rating);
  const reviewBody = String(body.body ?? "").trim();
  if (!transactionId || !Number.isInteger(rating) || rating < 1 || rating > 5 || reviewBody.length < 10) {
    return NextResponse.json({ error: "A completed order, a rating from 1 to 5, and a review are required." }, { status: 400 });
  }

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .select("id,buyer_id,seller_id,listing_id,status")
    .eq("id", transactionId)
    .maybeSingle();
  if (transactionError || !transaction || transaction.status !== "completed") {
    return NextResponse.json({ error: "Reviews are available after this account completes the order." }, { status: 422 });
  }
  if (transaction.buyer_id !== user.id && transaction.seller_id !== user.id) {
    return NextResponse.json({ error: "You can only review your own orders." }, { status: 403 });
  }

  const revieweeId = transaction.buyer_id === user.id ? transaction.seller_id : transaction.buyer_id;
  const { error } = await supabase.from("reviews").insert({
    transaction_id: transaction.id,
    reviewer_id: user.id,
    reviewee_id: revieweeId,
    listing_id: transaction.listing_id,
    rating,
    body: reviewBody,
    status: "published",
    is_public: true
  });
  if (error) return NextResponse.json({ error: "That review could not be saved." }, { status: 422 });
  return NextResponse.json({ ok: true, message: "Review saved for this order." });
}
