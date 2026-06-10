export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { blockUserAction } from "@/app/dashboard/messages/actions";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to block user.";
  const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    await blockUserAction({ conversationId: id, blockedId: body.blockedId, reason: body.reason });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
