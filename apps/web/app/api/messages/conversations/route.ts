export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createConversationAction } from "@/app/dashboard/messages/actions";
import { getConversationSummaries } from "@/lib/messaging/queries";
import { createClient } from "@/lib/supabase/server";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Messaging request failed.";
  const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to view conversations." }, { status: 401 });
    const conversations = await getConversationSummaries(supabase, user.id);
    return NextResponse.json({ conversations });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const conversation = await createConversationAction(await request.json());
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
