import { NextResponse } from "next/server";
import { env } from "@/lib/env.server";
import { hasValidBearerSecret } from "@/lib/security/secrets";
import { runTrustSafetyWorkers } from "@/lib/trust-safety/workers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const worker = url.searchParams.get("worker") ?? "all";
  const limit = Number(url.searchParams.get("limit") ?? "100");

  if (!env.ADMIN_WORKER_SECRET) {
    return NextResponse.json({ error: "Admin worker secret is not configured." }, { status: 503 });
  }

  if (!hasValidBearerSecret(request, env.ADMIN_WORKER_SECRET, "x-admin-secret")) {
    return NextResponse.json({ error: "Invalid admin worker secret." }, { status: 401 });
  }

  const results = await runTrustSafetyWorkers(worker, Number.isFinite(limit) ? limit : 100);
  return NextResponse.json({ ok: true, results });
}
