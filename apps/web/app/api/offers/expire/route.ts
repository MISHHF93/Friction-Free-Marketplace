export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { env } from "@/lib/env.server";
import { hasValidBearerSecret } from "@/lib/security/secrets";
import { createAdminClient } from "@/lib/supabase/admin";

function authorized(request: Request) {
  if (!env.SCHEDULED_JOB_SECRET) return process.env.NODE_ENV !== "production";
  return hasValidBearerSecret(request, env.SCHEDULED_JOB_SECRET);
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && !env.SCHEDULED_JOB_SECRET) {
    return NextResponse.json({ error: "Scheduled job secret is not configured." }, { status: 503 });
  }
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized offer expiration request." }, { status: 401 });

  const { data, error } = await createAdminClient().rpc("expire_due_offers");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, expired: Number(data ?? 0) });
}
