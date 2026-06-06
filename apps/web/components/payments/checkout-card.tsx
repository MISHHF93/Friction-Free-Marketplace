"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, LockKeyhole, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { publicEnv } from "@/lib/env";

type StripeJs = {
  elements: () => { create: (type: "card", options?: Record<string, unknown>) => { mount: (selector: string) => void; destroy: () => void } };
  confirmCardPayment: (clientSecret: string, options: Record<string, unknown>) => Promise<{ error?: { message?: string }; paymentIntent?: { id: string; status: string } }>;
};

declare global {
  interface Window {
    Stripe?: (key: string) => StripeJs;
  }
}

type CheckoutCardProps = {
  listingId: string;
  priceAmount: number;
  currency: string;
  disabled?: boolean;
};

export function CheckoutCard({ listingId, priceAmount, currency, disabled = false }: CheckoutCardProps) {
  const [stripe, setStripe] = useState<StripeJs | null>(null);
  const [cardReady, setCardReady] = useState(false);
  const [shipping, setShipping] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [status, setStatus] = useState("Ready for secure checkout.");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cardRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    if (!publicEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setStatus("Stripe publishable key is not configured.");
      return;
    }

    const setupStripe = () => {
      if (!window.Stripe || !publicEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) return;
      const stripeClient = window.Stripe(publicEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      const elements = stripeClient.elements();
      const card = elements.create("card", {
        style: { base: { fontSize: "16px", color: "#0f172a", "::placeholder": { color: "#94a3b8" } } }
      });
      card.mount("#stripe-card-element");
      cardRef.current = card;
      setStripe(stripeClient);
      setCardReady(true);
    };

    if (window.Stripe) setupStripe();
    else {
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.async = true;
      script.onload = setupStripe;
      document.body.appendChild(script);
    }

    return () => cardRef.current?.destroy();
  }, []);

  const feeBase = (deposit > 0 ? deposit : priceAmount) + shipping;
  const platformFee = Math.max(0.99, feeBase * 0.05);
  const total = feeBase + platformFee;

  async function startCheckout() {
    if (!stripe || !cardRef.current) return;
    setIsSubmitting(true);
    setStatus("Creating a manual-capture PaymentIntent…");

    try {
      const response = await fetch("/api/stripe/payment-intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          shippingCents: Math.round(shipping * 100),
          reservationDepositCents: deposit > 0 ? Math.round(deposit * 100) : undefined
        })
      });
      const payment = await response.json();
      if (!response.ok) throw new Error(payment.error ?? "Could not start checkout.");

      setTransactionId(payment.transactionId);
      setStatus("Confirming card authorization with Stripe…");
      const result = await stripe.confirmCardPayment(payment.clientSecret, {
        payment_method: { card: cardRef.current }
      });

      if (result.error) throw new Error(result.error.message ?? "Card authorization failed.");
      setStatus(`Payment ${result.paymentIntent?.status}. Funds are authorized and await marketplace capture.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Checkout failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5 text-primary" /> Stripe escrow checkout</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="shipping">Shipping estimate</Label>
            <Input id="shipping" type="number" min="0" step="0.01" value={shipping} onChange={(event) => setShipping(Number(event.target.value))} />
          </div>
          <div>
            <Label htmlFor="deposit">Reservation deposit</Label>
            <Input id="deposit" type="number" min="0" step="0.01" placeholder="Optional" value={deposit} onChange={(event) => setDeposit(Number(event.target.value))} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background p-3" id="stripe-card-element" />
        <div className="space-y-1 rounded-xl bg-background p-3 text-sm">
          <p className="flex justify-between"><span>Item/deposit</span><strong>{currency} ${feeBase.toFixed(2)}</strong></p>
          <p className="flex justify-between"><span>Platform protection fee</span><strong>{currency} ${platformFee.toFixed(2)}</strong></p>
          <p className="flex justify-between text-base"><span>Total authorized</span><strong>{currency} ${total.toFixed(2)}</strong></p>
        </div>
        <Button className="w-full" size="lg" onClick={startCheckout} disabled={disabled || !cardReady || isSubmitting}>
          <ShieldCheck className="h-4 w-4" /> {isSubmitting ? "Authorizing…" : "Authorize payment"}
        </Button>
        {transactionId && <p className="flex items-center gap-2 text-xs text-muted-foreground"><ReceiptText className="h-4 w-4" /> Transaction {transactionId}</p>}
        <p className="text-xs text-muted-foreground">{status}</p>
      </CardContent>
    </Card>
  );
}
