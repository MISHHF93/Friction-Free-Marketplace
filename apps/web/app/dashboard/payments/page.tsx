import { CreditCard, Landmark, ShieldCheck } from "lucide-react";
import { SellerOnboardingCard } from "@/components/payments/seller-onboarding-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentsDashboardPage() {
  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Payments</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Stripe Connect payment operations</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">Onboard sellers, monitor authorization/capture state, hold funds until completion, and release payouts through connected accounts.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <SellerOnboardingCard />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Escrow-style state machine</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {[
              "pending_payment → PaymentIntent created",
              "paid → card authorized with manual capture",
              "escrowed → funds captured and held on platform balance",
              "completed → seller net amount transferred to Stripe connected account",
              "refunded/disputed → payment remediation and audit events recorded"
            ].map((step) => <div key={step} className="rounded-xl bg-secondary px-4 py-3 font-medium text-foreground">{step}</div>)}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Buyer checkout</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">PaymentIntents use automatic payment methods and <strong>manual capture</strong>. Reservation deposits authorize only the deposit amount; full checkout authorizes item, shipping, tax, and platform fee.</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /> Seller payout</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">After delivery or pickup confirmation, the release endpoint creates a Stripe Transfer to the seller account and records a payout plus receipt.</CardContent>
        </Card>
      </div>
    </section>
  );
}
