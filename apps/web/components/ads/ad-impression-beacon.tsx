"use client";

import { useEffect } from "react";

export function AdImpressionBeacon({ campaignId }: { campaignId: string }) {
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/ads/impression/${campaignId}`, {
      method: "POST",
      credentials: "omit",
      keepalive: true,
      signal: controller.signal
    }).catch(() => undefined);
    return () => controller.abort();
  }, [campaignId]);

  return null;
}
