export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { isTrustedMutationOrigin } from "@/lib/security/request-origin";

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  return NextResponse.json(
    {
      error: "Legacy Stripe Checkout is disabled. Use /api/stripe/payment-intents so price, seller eligibility, escrow, ledger, and audit records are derived from trusted database state."
    },
    { status: 410 }
  );
}
