import { env } from "@/lib/env.server";

export type AnalyticsEvent = {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
};

export async function captureServerEvent({ distinctId, event, properties = {} }: AnalyticsEvent) {
  if (!env.POSTHOG_KEY) return { skipped: true as const };

  const response = await fetch(`${env.POSTHOG_HOST}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: env.POSTHOG_KEY,
      distinct_id: distinctId,
      event,
      properties: {
        ...properties,
        app: "friction-free-marketplace"
      }
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(2_000)
  });

  if (!response.ok) {
    throw new Error(`PostHog capture failed (${response.status}).`);
  }

  return { captured: true as const };
}
