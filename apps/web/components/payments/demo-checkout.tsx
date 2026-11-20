"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SampleCheckoutPreview({ listingId }: { listingId: string }) {
  const [status, setStatus] = useState("Local demo only. This preview does not charge a card.");
  const [pending, setPending] = useState(false);

  async function preview() {
    setPending(true);
    try {
      const response = await fetch("/api/stripe/payment-intents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID()
        },
        body: JSON.stringify({ listingId, shippingCents: 0, taxCents: 0, preview: true })
      });
      const payment = await response.json();
      setStatus(response.ok ? `Test authorization ${payment.transactionId ?? "ready"} is ready. No charge was made.` : String(payment.error ?? "Checkout preview did not start."));
    } catch {
      setStatus("Checkout preview did not start.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Button size="lg" className="w-full" type="button" onClick={preview} disabled={pending}>
        {pending ? "Preparing test authorization…" : "Preview test authorization"}
      </Button>
      <p className="text-sm text-muted-foreground" role="status">{status}</p>
    </div>
  );
}
