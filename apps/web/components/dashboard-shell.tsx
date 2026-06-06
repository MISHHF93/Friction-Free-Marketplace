import type { ComponentType, ReactNode } from "react";
import {
  Bell,
  Heart,
  Home,
  ListChecks,
  MessageSquare,
  Package,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tags,
  UserCheck
} from "lucide-react";
import { DashboardMobileNavigation, DashboardSidebar } from "@/components/dashboard-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type DashboardLink = {
  href: string;
  label: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
};

export const dashboardLinks: DashboardLink[] = [
  { href: "/dashboard", label: "Home", description: "Snapshot and next actions", icon: Home },
  { href: "/dashboard/listings", label: "My listings", description: "Draft, publish, and manage inventory", icon: Tags },
  { href: "/dashboard/favorites", label: "Favorites", description: "Saved listings and collections", icon: Heart },
  { href: "/dashboard/saved-searches", label: "Saved searches", description: "Alerts and market tracking", icon: Search },
  { href: "/dashboard/messages", label: "Messages", description: "Conversations and safety tools", icon: MessageSquare },
  { href: "/dashboard/offers", label: "Offers", description: "Buyer and seller negotiations", icon: ReceiptText },
  { href: "/dashboard/purchases", label: "Purchases", description: "Orders, delivery, and disputes", icon: ShoppingBag },
  { href: "/dashboard/sales", label: "Sales", description: "Fulfillment and payouts", icon: Store },
  { href: "/dashboard/trust-score", label: "Trust score", description: "Reliability and risk signals", icon: ShieldCheck },
  { href: "/dashboard/verification", label: "Verification center", description: "Identity and account limits", icon: UserCheck },
  { href: "/dashboard/settings", label: "Settings", description: "Profile, notifications, privacy", icon: Settings }
];

export function DashboardShell({
  title,
  description,
  links = dashboardLinks,
  children
}: {
  title: string;
  description: string;
  links?: DashboardLink[];
  children: ReactNode;
}) {
  const navigationLinks = links.map(({ icon: _icon, ...link }) => link);

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[300px_1fr] lg:px-8">
      <DashboardSidebar links={navigationLinks} />
      <div className="min-w-0 space-y-6">
        <DashboardMobileNavigation links={navigationLinks} />
        <div className="rounded-3xl border border-border bg-card/90 p-5 shadow-sm sm:p-6">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            <Bell className="h-4 w-4" /> Protected workspace
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

export function DashboardStatCard({ label, value, detail, icon: Icon = Package }: { label: string; value: string; detail: string; icon?: ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <p className="text-3xl font-black">{value}</p>
      </CardHeader>
      <CardContent className="text-sm leading-6 text-muted-foreground">{detail}</CardContent>
    </Card>
  );
}

export function DashboardActionCard({ title, description, icon: Icon = ListChecks, children }: { title: string; description: string; icon?: ComponentType<{ className?: string }>; children?: ReactNode }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <Icon className="h-6 w-6 text-primary" />
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
        <p>{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}

export function DashboardEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-full bg-secondary p-4">
          <Package className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
