import { Banknote, Box, Send, Store } from "lucide-react";
import { DashboardActionCard, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
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
            <div key={sale.item} className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{sale.item}</p><Badge>{sale.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{sale.payout}</p></div>
              <Button size="sm">Manage</Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <DashboardActionCard icon={Send} title="Payout readiness" description="Connect payout details, resolve verification holds, upload tracking, and keep buyer communication in-app to reduce dispute risk." />
    </DashboardShell>
  );
}
