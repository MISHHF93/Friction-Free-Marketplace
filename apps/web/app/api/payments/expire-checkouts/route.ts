import { NextResponse } from "next/server";
import { env } from "@/lib/env.server";
import { expireAbandonedCheckouts } from "@/lib/payments/expire-checkout";
import { remindAndCancelUncapturedOrders } from "@/lib/payments/uncaptured-order";
import { authorizeJobRequest } from "@/lib/security/secrets";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function run(request: Request) {
  const authorization = authorizeJobRequest(request, env.SCHEDULED_JOB_SECRET, "Unauthorized checkout expiry request.");
  if (!authorization.ok) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  try {
    const supabase = createAdminClient() as any;
    const result = await expireAbandonedCheckouts(supabase);
    const uncaptured = await remindAndCancelUncapturedOrders(supabase);
    return NextResponse.json({ ok: true, ...result, uncaptured });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout expiry failed." }, { status: 500 });
  }
}

export function GET(request: Request) {
  return run(request);
}

export function POST(request: Request) {
  return run(request);
}
