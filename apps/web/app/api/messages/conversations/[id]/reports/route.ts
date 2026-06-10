export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { reportMessageAction, reportUserAction } from "@/app/dashboard/messages/actions";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to create report.";
  const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (body.messageId) {
      await reportMessageAction({ conversationId: id, messageId: body.messageId, reason: body.reason });
    } else {
      await reportUserAction({ conversationId: id, reportedUserId: body.reportedUserId, reason: body.reason });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
