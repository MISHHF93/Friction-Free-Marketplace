export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";

export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  return NextResponse.json(
    {
      error: "Legacy Stripe Checkout is disabled. Use /api/stripe/payment-intents so price, seller eligibility, escrow, ledger, and audit records are derived from trusted database state."
    },
    { status: 410 }
  );
}
