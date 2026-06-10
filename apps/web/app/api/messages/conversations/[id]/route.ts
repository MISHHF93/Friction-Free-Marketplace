export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getConversationSummaryById } from "@/lib/messaging/queries";
import { createClient } from "@/lib/supabase/server";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Messaging request failed.";
  const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to view this conversation." }, { status: 401 });
    const conversation = await getConversationSummaryById(supabase, id);
    if (![conversation.buyer_id, conversation.seller_id].includes(user.id)) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }
    return NextResponse.json({ conversation });
  } catch (error) {
    return errorResponse(error);
  }
}
