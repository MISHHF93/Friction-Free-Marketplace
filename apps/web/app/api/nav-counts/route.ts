import { NextResponse } from "next/server";
import { getMarketplaceSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getMarketplaceSession();
  if (!session || session.source !== "supabase") return NextResponse.json({ messages: 0, offers: 0 });
  const supabase = await createClient() as any;
  const [{ count: messages }, { count: offers }] = await Promise.all([
    supabase.from("messages").select("id", { count: "exact", head: true }).is("read_at", null).neq("sender_id", session.id),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("status", "pending").or(`buyer_id.eq.${session.id},seller_id.eq.${session.id}`)
  ]);
  return NextResponse.json({ messages: messages ?? 0, offers: offers ?? 0 });
}
