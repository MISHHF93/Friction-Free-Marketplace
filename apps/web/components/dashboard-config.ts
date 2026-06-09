import type { ComponentType } from "react";
import {
  Heart,
  Home,
  MessageSquare,
  ReceiptText,
  Search,
  Settings,
  Sparkles,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tags,
  UserCheck,
  WalletCards
} from "lucide-react";

export type DashboardLink = {
  href: string;
  label: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
};

export const dashboardLinks: DashboardLink[] = [
  { href: "/dashboard", label: "Overview", description: "Snapshot and next actions", icon: Home },
  { href: "/dashboard/listings", label: "My listings", description: "Draft, publish, and manage inventory", icon: Tags },
  { href: "/dashboard/messages", label: "Messages", description: "Conversations and safety tools", icon: MessageSquare },
  { href: "/dashboard/offers", label: "Offers", description: "Buyer and seller negotiations", icon: ReceiptText },
  { href: "/dashboard/sales", label: "Sales", description: "Fulfillment and payouts", icon: Store },
  { href: "/dashboard/purchases", label: "Purchases", description: "Orders, delivery, and disputes", icon: ShoppingBag },
  { href: "/dashboard/favorites", label: "Favorites", description: "Saved listings and collections", icon: Heart },
  { href: "/dashboard/saved-searches", label: "Saved searches", description: "Alerts and market tracking", icon: Search },
  { href: "/dashboard/ai-listing-creator", label: "AI assistant", description: "Generate listings and commerce guidance", icon: Sparkles },
  { href: "/dashboard/trust-score", label: "Trust score", description: "Reliability and risk signals", icon: ShieldCheck },
  { href: "/dashboard/verification", label: "Verification center", description: "Identity and account limits", icon: UserCheck },
  { href: "/dashboard/payments", label: "Payments", description: "Checkout, payouts, and protected payments", icon: WalletCards },
  { href: "/dashboard/settings", label: "Settings", description: "Profile, notifications, privacy", icon: Settings }
];

export function getSerializableDashboardLinks(links: DashboardLink[] = dashboardLinks) {
  return links.map(({ icon: _icon, ...link }) => link);
}
