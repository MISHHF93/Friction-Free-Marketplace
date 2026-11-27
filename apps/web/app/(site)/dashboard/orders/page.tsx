import Link from "next/link";
import { ShoppingBag, Store } from "lucide-react";
import { DashboardActionCard, DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";

export default function OrdersPage() {
  return (
    <DashboardShell title="Orders" description="Review what you have bought and sold.">
      <div className="grid gap-5 sm:grid-cols-2">
        <DashboardActionCard icon={ShoppingBag} title="Purchases" description="Track delivery, payment status, returns, and support for items you buy.">
          <Button asChild><Link href="/dashboard/purchases">View purchases</Link></Button>
        </DashboardActionCard>
        <DashboardActionCard icon={Store} title="Sales" description="Monitor fulfillment, payouts, and buyer communication for items you sell.">
          <Button asChild><Link href="/dashboard/sales">View sales</Link></Button>
        </DashboardActionCard>
      </div>
    </DashboardShell>
  );
}
