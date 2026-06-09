export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { uploadMessageAttachmentsAction } from "@/app/dashboard/messages/actions";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to upload attachments.";
  const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    formData.set("conversationId", id);
    const attachments = await uploadMessageAttachmentsAction(formData);
    return NextResponse.json({ attachments }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
