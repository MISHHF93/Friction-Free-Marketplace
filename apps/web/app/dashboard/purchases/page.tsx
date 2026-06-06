import { LifeBuoy, PackageCheck, RotateCcw, ShoppingBag } from "lucide-react";
import { DashboardActionCard, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const purchases = [
  { item: "Sony A7C II body", status: "In transit", milestone: "Delivery estimate: June 9" },
  { item: "Oak media console", status: "Pickup scheduled", milestone: "Meetup: Saturday 10:00 AM" },
  { item: "Mechanical keyboard bundle", status: "Delivered", milestone: "Inspection window closes tomorrow" }
];

export default function PurchasesPage() {
  return (
    <DashboardShell title="Purchases" description="Track checkout, escrow, shipping, pickup, inspection windows, returns, and support cases for buyer orders.">
      <div className="grid gap-5 sm:grid-cols-3">
        <DashboardStatCard icon={ShoppingBag} label="Active purchases" value="4" detail="2 shipping, 1 pickup, 1 inspection." />
        <DashboardStatCard icon={PackageCheck} label="Completed" value="21" detail="Orders completed with protected payment history." />
        <DashboardStatCard icon={RotateCcw} label="Returns" value="1" detail="One seller response is due in 24 hours." />
      </div>
      <Card>
        <CardHeader><CardTitle>Order timeline</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {purchases.map((purchase) => (
            <div key={purchase.item} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">{purchase.item}</p><Badge>{purchase.status}</Badge></div>
              <p className="mt-2 text-sm text-muted-foreground">{purchase.milestone}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <DashboardActionCard icon={LifeBuoy} title="Buyer protection" description="Open support cases, request returns, report unsafe meetup behavior, and keep every protected payment event in one ledger.">
        <Button variant="outline">Contact support</Button>
      </DashboardActionCard>
    </DashboardShell>
  );
}
