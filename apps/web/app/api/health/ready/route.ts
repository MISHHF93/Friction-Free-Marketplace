import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { evaluateReadiness } from "@/lib/health/readiness";
import { getRequestId, recordReliabilityEvent } from "@/lib/observability/reliability";

export const dynamic = "force-dynamic";

function secretMatches(request: Request) {
  const provided = request.headers.get("x-health-secret") ?? "";
  const expected = process.env.HEALTH_CHECK_SECRET || process.env.ADMIN_WORKER_SECRET || "";
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  if (!secretMatches(request)) {
    return NextResponse.json(
      { status: "ok" },
      { status: 200, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } }
    );
  }

  const startedAt = Date.now();
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
