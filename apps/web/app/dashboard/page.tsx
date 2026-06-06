import { Package, Search, ShieldCheck, Wallet } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardStats } from "@/lib/marketplace-data";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/purchases", label: "Purchases" },
  { href: "/dashboard/offers", label: "Offers" },
  { href: "/dashboard/messages", label: "Messages" },
  { href: "/dashboard/favorites", label: "Favorites" },
  { href: "/dashboard/settings", label: "Settings" }
];

const actions = [
  { icon: Search, title: "Saved search digest", text: "Track market moves and restock alerts across your favorite categories." },
  { icon: ShieldCheck, title: "Verification center", text: "Upload identity and address signals to unlock higher escrow limits." },
  { icon: Package, title: "Order timeline", text: "Follow payment, shipping, delivery, and dispute milestones in one place." },
  { icon: Wallet, title: "Wallet controls", text: "Review refunds, credits, and protected transaction history." }
];

export default function DashboardPage() {
  return (
    <DashboardShell title="Buyer dashboard" description="A protected user shell for purchases, offers, messages, saved searches, and trust controls." links={links}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat) => (
          <Card key={stat.label}><CardHeader><CardTitle className="text-sm text-muted-foreground">{stat.label}</CardTitle><p className="text-3xl font-black">{stat.value}</p></CardHeader></Card>
        ))}
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {actions.map((action) => (
          <Card key={action.title}>
            <CardHeader><action.icon className="h-6 w-6 text-primary" /><CardTitle>{action.title}</CardTitle></CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">{action.text}</CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
