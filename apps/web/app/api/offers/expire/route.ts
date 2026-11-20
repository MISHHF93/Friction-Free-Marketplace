export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { env } from "@/lib/env.server";
import { authorizeJobRequest } from "@/lib/security/secrets";
import { createAdminClient } from "@/lib/supabase/admin";

async function expireOffers(request: Request) {
  const authorization = authorizeJobRequest(request, env.SCHEDULED_JOB_SECRET, "Unauthorized offer expiration request.");
  if (!authorization.ok) return NextResponse.json({ error: authorization.error }, { status: authorization.status });

  const { data, error } = await createAdminClient().rpc("expire_due_offers");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, expired: Number(data ?? 0) });
}

export function POST(request: Request) {
  return expireOffers(request);
}

export function GET(request: Request) {
  return expireOffers(request);
}
