export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { markConversationReadAction } from "@/app/dashboard/messages/actions";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to update read receipts.";
  const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    await markConversationReadAction({ conversationId: id, messageIds: Array.isArray(body.messageIds) ? body.messageIds : [] });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
