"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  const stripeKey = publicEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const checkoutConfigured = Boolean(stripeKey && !stripeKey.includes("placeholder"));
  const [stripe, setStripe] = useState<StripeJs | null>(null);
  const [cardReady, setCardReady] = useState(false);
  const [shipping, setShipping] = useState(0);
  const [status, setStatus] = useState(checkoutConfigured ? "Ready for protected checkout." : "Checkout is not configured yet.");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cardRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    if (!checkoutConfigured || !stripeKey) {
      return;
    }

    const setupStripe = () => {
      if (!window.Stripe) return;
      const stripeClient = window.Stripe(stripeKey);
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
  }, [checkoutConfigured, stripeKey]);

  const feeBase = priceAmount + shipping;
  const platformFee = Math.max(0.99, feeBase * 0.05);
  const total = feeBase + platformFee;

  async function startCheckout() {
    if (!stripe || !cardRef.current) return;
    setIsSubmitting(true);
    setStatus("Preparing protected checkout...");

    try {
      const response = await fetch("/api/stripe/payment-intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          shippingCents: Math.round(shipping * 100)
        })
      });
      const payment = await response.json();
      if (!response.ok) throw new Error(payment.error ?? "Could not start checkout.");

      setTransactionId(payment.transactionId);
      setStatus("Authorizing payment...");
      const result = await stripe.confirmCardPayment(payment.clientSecret, {
        payment_method: { card: cardRef.current }
      });

      if (result.error) throw new Error(result.error.message ?? "Payment authorization did not go through.");
      setStatus(`Payment ${result.paymentIntent?.status}. Funds are authorized. Track next steps from Purchases while the seller fulfills the order.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Checkout did not complete. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5 text-primary" /> Protected checkout</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="grid gap-3">
          <div>
            <Label htmlFor="shipping">Shipping estimate</Label>
            <Input id="shipping" type="number" min="0" step="0.01" value={shipping} onChange={(event) => setShipping(Number(event.target.value))} />
          </div>
        </div>
        <div className="rounded-xl border border-primary/20 bg-background p-3 text-xs leading-5 text-muted-foreground">
          Protected checkout authorizes the full item price plus shipping and platform fee. Reservation deposits stay inside offer scheduling, not buy-now checkout.
        </div>
        <div className="rounded-xl border border-border bg-background p-3" id="stripe-card-element" />
        <div className="space-y-1 rounded-xl bg-background p-3 text-sm">
          <p className="flex flex-wrap justify-between gap-2"><span>Item and shipping</span><strong>{currency} ${feeBase.toFixed(2)}</strong></p>
          <p className="flex flex-wrap justify-between gap-2"><span>Protection fee</span><strong>{currency} ${platformFee.toFixed(2)}</strong></p>
          <p className="flex flex-wrap justify-between gap-2 text-base"><span>Total authorized</span><strong>{currency} ${total.toFixed(2)}</strong></p>
        </div>
        <Button className="w-full" size="lg" onClick={startCheckout} disabled={disabled || !checkoutConfigured || !cardReady || isSubmitting}>
          <ShieldCheck className="h-4 w-4" /> {isSubmitting ? "Authorizing…" : "Authorize payment"}
        </Button>
        {transactionId && (
          <div className="grid gap-2 rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-2"><ReceiptText className="h-4 w-4" /> Transaction {transactionId}</p>
            <Button asChild size="sm" variant="outline"><Link href="/dashboard/purchases">Track in Purchases</Link></Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{status}</p>
      </CardContent>
    </Card>
  );
}
