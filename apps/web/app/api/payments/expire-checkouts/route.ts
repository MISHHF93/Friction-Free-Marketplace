import { NextResponse } from "next/server";
import { env } from "@/lib/env.server";
import { advanceAdLifecycle } from "@/lib/ads/lifecycle";
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
    // Sponsored placements ride on this existing scheduled job.
    let ads: Awaited<ReturnType<typeof advanceAdLifecycle>> | { error: string };
    try {
      ads = await advanceAdLifecycle(supabase);
    } catch (error) {
      ads = { error: error instanceof Error ? error.message : "Ad lifecycle sweep failed." };
    }
    return NextResponse.json({ ok: true, ...result, uncaptured, ads });
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
