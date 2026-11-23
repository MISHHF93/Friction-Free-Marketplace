"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { newAdRequestKey } from "@/lib/ads/request-key";

export function ResumeAdPayment({ campaignId }: { campaignId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resume() {
    setPending(true);
    setError(null);
    try {
      const key = newAdRequestKey();
      const response = await fetch("/api/ads/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ campaignId })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || typeof payload.url !== "string") throw new Error(typeof payload.error === "string" ? payload.error : "Could not open checkout.");
      window.location.assign(payload.url);
    } catch (resumeError) {
      setError(resumeError instanceof Error ? resumeError.message : "Could not open checkout.");
      setPending(false);
    }
  }

  return (
    <div className="grid gap-1">
      <Button type="button" size="sm" onClick={resume} disabled={pending}>{pending ? "Opening…" : "Finish payment"}</Button>
      {error ? <p role="alert" className="text-xs font-semibold text-destructive">{error}</p> : null}
    </div>
  );
}
