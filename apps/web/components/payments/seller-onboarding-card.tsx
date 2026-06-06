"use client";

import { useEffect, useState } from "react";
import { ExternalLink, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SellerOnboardingCard() {
  const [status, setStatus] = useState("Checking Stripe Connect status…");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch("/api/stripe/connect/status")
      .then((response) => response.json())
      .then((data) => setStatus(`Connect status: ${data.status ?? "not_started"}`))
      .catch(() => setStatus("Connect status unavailable."));
  }, []);

  async function startOnboarding() {
    setIsLoading(true);
    setStatus("Creating Stripe Connect onboarding link…");
    try {
      const response = await fetch("/api/stripe/connect/onboard", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not start onboarding.");
      window.location.href = data.url;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Onboarding failed.");
      setIsLoading(false);
    }
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-primary" /> Seller payouts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Complete Stripe Express onboarding to accept marketplace payments and receive seller payouts after escrow release.</p>
        <div className="rounded-xl bg-secondary p-3 text-sm font-medium">{status}</div>
        <Button onClick={startOnboarding} disabled={isLoading}>
          <ExternalLink className="h-4 w-4" /> {isLoading ? "Opening Stripe…" : "Continue Stripe onboarding"}
        </Button>
      </CardContent>
    </Card>
  );
}
