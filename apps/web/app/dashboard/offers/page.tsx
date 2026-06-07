import { ArrowRightLeft, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { DashboardActionCard, DashboardListItem, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
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
            <DashboardListItem key={offer.item} title={offer.item} detail={`Current offer: ${offer.amount} · protected checkout available after acceptance.`} status={offer.status} meta={<span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">{offer.role}</span>}>
              <Button size="sm">Review</Button>
            </DashboardListItem>
          ))}
        </CardContent>
      </Card>
      <DashboardActionCard icon={DollarSign} title="Offer guardrails" description="Suggested counters, minimum acceptable prices, buyer reliability, and seller trust signals help both sides negotiate safely." />
    </DashboardShell>
  );
}
