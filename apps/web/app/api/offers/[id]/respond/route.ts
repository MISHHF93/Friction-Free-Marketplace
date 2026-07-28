export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { respondToOfferAction } from "@/app/dashboard/messages/actions";
import { isTrustedMutationOrigin } from "@/lib/security/request-origin";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to update offer.";
  const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    const { id } = await params;
    const body = await request.json();
    const offer = await respondToOfferAction({ offerId: id, status: body.status, message: body.message });
    return NextResponse.json({ offer });
  } catch (error) {
    return errorResponse(error);
  }
}
