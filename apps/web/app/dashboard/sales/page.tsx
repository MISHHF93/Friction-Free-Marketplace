import { Banknote, Box, Send, Store } from "lucide-react";
import { DashboardActionCard, DashboardListItem, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sales = [
  { item: "Walnut dining table", status: "Awaiting pickup", payout: "$795 pending" },
  { item: "Canon RF lens", status: "Ship by today", payout: "$915 in escrow" },
  { item: "Vintage speakers", status: "Inspection open", payout: "$420 pending release" }
];

export default function SalesPage() {
  return (
    <DashboardShell title="Sales" description="Fulfill sold items, monitor escrow releases, view payout readiness, and protect seller performance.">
      <div className="grid gap-5 sm:grid-cols-3">
        <DashboardStatCard icon={Store} label="Active sales" value="6" detail="3 need fulfillment action this week." />
        <DashboardStatCard icon={Banknote} label="Pending payout" value="$2.1k" detail="Escrow release depends on delivery and inspection." />
        <DashboardStatCard icon={Box} label="Fulfillment rate" value="97%" detail="Strong seller reliability signal." />
      </div>
      <Card>
        <CardHeader><CardTitle>Seller fulfillment queue</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {sales.map((sale) => (
            <DashboardListItem key={sale.item} title={sale.item} detail={sale.payout} status={sale.status}>
              <Button size="sm">Manage</Button>
            </DashboardListItem>
          ))}
        </CardContent>
      </Card>
      <DashboardActionCard icon={Send} title="Payout readiness" description="Connect payout details, resolve verification holds, upload tracking, and keep buyer communication in-app to reduce dispute risk." />
    </DashboardShell>
  );
}
