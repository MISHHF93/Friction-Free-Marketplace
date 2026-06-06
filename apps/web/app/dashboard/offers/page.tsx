import { ArrowRightLeft, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { DashboardActionCard, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const offers = [
  { item: "Fuji X100VI camera kit", role: "Buyer", amount: "$1,540", status: "Countered" },
  { item: "Walnut dining table", role: "Seller", amount: "$820", status: "Awaiting response" },
  { item: "Steam Deck OLED", role: "Buyer", amount: "$475", status: "Accepted" }
];

export default function OffersPage() {
  return (
    <DashboardShell title="Offers" description="Manage buyer and seller negotiations, counters, expirations, reservation deposits, and accepted offer handoffs.">
      <div className="grid gap-5 sm:grid-cols-3">
        <DashboardStatCard icon={ArrowRightLeft} label="Open negotiations" value="5" detail="2 are seller-side and 3 are buyer-side." />
        <DashboardStatCard icon={Clock} label="Expiring soon" value="2" detail="Respond before offer protections lapse." />
        <DashboardStatCard icon={CheckCircle2} label="Accepted this month" value="7" detail="4 converted to completed transactions." />
      </div>
      <Card>
        <CardHeader><CardTitle>Negotiation inbox</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {offers.map((offer) => (
            <div key={offer.item} className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{offer.item}</p><Badge>{offer.role}</Badge><Badge>{offer.status}</Badge></div>
                <p className="mt-1 text-sm text-muted-foreground">Current offer: {offer.amount} · protected checkout available after acceptance.</p>
              </div>
              <Button size="sm">Review</Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <DashboardActionCard icon={DollarSign} title="Offer guardrails" description="Suggested counters, minimum acceptable prices, buyer reliability, and seller trust signals help both sides negotiate safely." />
    </DashboardShell>
  );
}
