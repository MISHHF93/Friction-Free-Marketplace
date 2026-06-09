"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, RefreshCw, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ConnectStatus = "not_started" | "onboarding" | "pending" | "active" | "restricted";

type ConnectStatusResponse = {
  accountId?: string;
  status: ConnectStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  disabledReason?: string | null;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    pendingVerification: string[];
  };
  message: string;
  canAcceptPayments: boolean;
  canReceivePayouts: boolean;
  lastSyncedAt?: string;
  error?: string;
};

const fallbackStatus: ConnectStatusResponse = {
  status: "not_started",
  chargesEnabled: false,
  payoutsEnabled: false,
  detailsSubmitted: false,
  requirements: { currentlyDue: [], eventuallyDue: [], pastDue: [], pendingVerification: [] },
  message: "Set up a Stripe Express account to receive seller payouts.",
  canAcceptPayments: false,
  canReceivePayouts: false
};

const statusLabels: Record<ConnectStatus, string> = {
  not_started: "Not started",
  onboarding: "Action required",
  pending: "Stripe review",
  active: "Ready",
  restricted: "Restricted"
};

export function SellerOnboardingCard() {
  const [connectStatus, setConnectStatus] = useState<ConnectStatusResponse>(fallbackStatus);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isOpeningDashboard, setIsOpeningDashboard] = useState(false);

  const blockingRequirements = useMemo(() => {
    const requirements = connectStatus.requirements;
    return [...requirements.pastDue, ...requirements.currentlyDue].filter(Boolean);
  }, [connectStatus.requirements]);

  async function refreshStatus() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/stripe/connect/status", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load payout setup status.");
      setConnectStatus(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Payout status is unavailable right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => refreshStatus());
  }, []);

  async function startOnboarding() {
    setIsStarting(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/stripe/connect/onboard", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not start payout setup.");
      window.location.href = data.url;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Payout setup did not start. Please try again.");
      setIsStarting(false);
    }
  }

  async function openDashboard() {
    setIsOpeningDashboard(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/stripe/connect/login-link", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not open your payout dashboard.");
      window.location.href = data.url;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The payout dashboard link did not open. Please try again.");
      setIsOpeningDashboard(false);
    }
  }

  const isReady = connectStatus.status === "active";
  const needsAction = connectStatus.status === "restricted" || connectStatus.status === "onboarding" || blockingRequirements.length > 0;

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WalletCards className="h-5 w-5 text-primary" /> Seller payouts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Complete Stripe-hosted setup to accept protected payments and receive seller payouts after an order is completed.
        </p>

        <div className="rounded-2xl border border-border bg-secondary/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : isReady ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
              <span className="font-semibold">{isLoading ? "Checking payout setup..." : statusLabels[connectStatus.status]}</span>
            </div>
            <Badge className={isReady ? "border-emerald-200 bg-emerald-50 text-emerald-700" : needsAction ? "border-amber-200 bg-amber-50 text-amber-700" : undefined}>
              {isReady ? "Payments enabled" : "Setup needed"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{connectStatus.message}</p>
          {connectStatus.disabledReason ? <p className="mt-2 text-xs font-medium text-destructive">Stripe restriction: {connectStatus.disabledReason}</p> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-3 text-sm">
            <p className="font-semibold">Accept payments</p>
            <p className="text-muted-foreground">{connectStatus.canAcceptPayments ? "Enabled" : "Unavailable until onboarding is complete"}</p>
          </div>
          <div className="rounded-xl border border-border p-3 text-sm">
            <p className="font-semibold">Receive payouts</p>
            <p className="text-muted-foreground">{connectStatus.canReceivePayouts ? "Enabled" : "Unavailable until bank and identity checks pass"}</p>
          </div>
        </div>

        {blockingRequirements.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">More information is needed</p>
            <p className="mt-1">Continue onboarding to resolve {blockingRequirements.length} requirement{blockingRequirements.length === 1 ? "" : "s"}.</p>
          </div>
        ) : null}

        {errorMessage ? <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{errorMessage}</div> : null}

        <div className="flex flex-wrap gap-3">
          <Button onClick={startOnboarding} disabled={isStarting || isLoading}>
            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            {isReady ? "Update payout profile" : "Continue payout setup"}
          </Button>
          {connectStatus.accountId ? (
            <Button variant="outline" onClick={openDashboard} disabled={isOpeningDashboard || isLoading}>
              {isOpeningDashboard ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Payout dashboard
            </Button>
          ) : null}
          <Button variant="ghost" onClick={refreshStatus} disabled={isLoading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
