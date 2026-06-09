import { CreditCard, Landmark, ShieldCheck } from "lucide-react";
import { SellerOnboardingCard } from "@/components/payments/seller-onboarding-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentsDashboardPage() {
  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Payments</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Protected payments and payouts</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">Set up seller payouts, review payment status, and understand how funds move from checkout to completion.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <SellerOnboardingCard />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Payment protection flow</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {[
              "Checkout starts and payment is prepared",
              "Buyer payment is authorized before handoff",
              "Funds are captured and held while the order is completed",
              "Seller payout is released after completion",
              "Refunds and disputes keep a recorded history"
            ].map((step) => <div key={step} className="rounded-xl bg-secondary px-4 py-3 font-medium text-foreground">{step}</div>)}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Buyer checkout</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Eligible checkout authorizes payment before funds are captured. Reservation deposits authorize only the deposit amount; full checkout includes item price, shipping, tax, and marketplace fee.</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /> Seller payout</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">After delivery or pickup is confirmed, the seller payout is released to the connected account and the receipt stays attached to the transaction.</CardContent>
        </Card>
      </div>
    </section>
  );
}
