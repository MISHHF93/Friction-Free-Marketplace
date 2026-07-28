import { randomUUID } from "node:crypto";
import { captureServerEvent } from "@/lib/analytics/posthog";

export type ReliabilityEvent = {
  event: string;
  route: string;
  status: "ok" | "degraded" | "error";
  durationMs?: number;
  provider?: string;
  errorCode?: string;
  requestId?: string;
};

export function getRequestId(request?: Request) {
  return request?.headers.get("x-request-id")?.slice(0, 128) || randomUUID();
}

export function recordReliabilityEvent(event: ReliabilityEvent) {
  const payload = {
    ...event,
    requestId: event.requestId ?? randomUUID(),
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RELEASE_SHA ?? "development",
    timestamp: new Date().toISOString(),
  };
  console.info(JSON.stringify(payload));
  return payload;
}

export async function captureReliabilityEvent(event: ReliabilityEvent) {
  const payload = recordReliabilityEvent(event);
  try {
    await captureServerEvent({
      distinctId: payload.requestId,
      event: `reliability.${event.event}`,
      properties: {
        route: event.route,
        status: event.status,
        duration_ms: event.durationMs,
        provider: event.provider,
        error_code: event.errorCode,
        release: payload.release,
      },
    });
  } catch {
    // Telemetry must never become a production-path dependency.
  }
  return payload;
}

export async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("PROVIDER_TIMEOUT")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
