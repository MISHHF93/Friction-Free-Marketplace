import { NextResponse } from "next/server";
import { evaluateReadiness } from "@/lib/health/readiness";
import { getRequestId, recordReliabilityEvent } from "@/lib/observability/reliability";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  const result = await evaluateReadiness();
  recordReliabilityEvent({
    event: "health.readiness",
    route: "/api/health/ready",
    status: result.status === "ready" ? "ok" : "error",
    durationMs: Date.now() - startedAt,
    requestId,
  });
  return NextResponse.json(result, {
    status: result.status === "ready" ? 200 : 503,
    headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
  });
}
