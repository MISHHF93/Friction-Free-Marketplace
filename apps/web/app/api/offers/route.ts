export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { makeOfferAction } from "@/app/dashboard/messages/actions";
import { isTrustedMutationOrigin } from "@/lib/security/request-origin";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to create offer.";
  const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    const offer = await makeOfferAction(await request.json());
    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
