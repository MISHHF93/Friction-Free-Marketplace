import type { ComponentType } from "react";
import {
  MessageSquare,
  Settings,
  ShoppingBag,
  Tags,
  WalletCards
} from "lucide-react";

export type DashboardLink = {
  href: string;
  label: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
};

export const dashboardLinks: DashboardLink[] = [
  { href: "/dashboard/listings", label: "Listings", description: "Draft, publish, and manage inventory", icon: Tags },
  { href: "/dashboard/messages", label: "Messages", description: "Conversations and offers", icon: MessageSquare },
  { href: "/dashboard/orders", label: "Orders", description: "Purchases and sales", icon: ShoppingBag },
  { href: "/dashboard/payments", label: "Payments", description: "Checkout, payouts, and protected payments", icon: WalletCards },
  { href: "/account", label: "Account", description: "Profile, notifications, and security", icon: Settings }
];

export function getSerializableDashboardLinks(links: DashboardLink[] = dashboardLinks) {
  return links.map(({ icon: _icon, ...link }) => link);
}
