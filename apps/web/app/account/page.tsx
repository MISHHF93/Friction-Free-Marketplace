import Link from "next/link";
import { Heart, LogOut, Settings, Store, Tags, ShoppingBag } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { getMarketplaceSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

const links = [
  { href: "/dashboard/purchases", label: "Purchases", description: "Items you bought", icon: ShoppingBag },
  { href: "/dashboard/sales", label: "Sales", description: "Items you sold", icon: Store },
  { href: "/dashboard/listings", label: "My listings", description: "Drafts and published inventory", icon: Tags },
  { href: "/dashboard/favorites", label: "Favourites", description: "Listings you saved", icon: Heart },
  { href: "/account/settings", label: "Settings", description: "Profile, notifications, and account deletion", icon: Settings }
];

export default async function MeHubPage() {
  const session = await getMarketplaceSession();
  if (!session) redirect("/login?next=/account");

  return (
    <section className="app-container py-6">
      <h1 className="text-hero">Me</h1>
      <p className="mt-2 text-sm text-muted-foreground">Signed in as {session.displayName}{session.email ? ` · ${session.email}` : ""}.</p>
      <nav className="mt-6 grid gap-2" aria-label="Account">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-secondary">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <span>
                <span className="block font-bold">{link.label}</span>
                <span className="block text-sm text-muted-foreground">{link.description}</span>
              </span>
            </Link>
          );
        })}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <LogOut className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <LogoutButton className="text-left text-sm font-bold" label="Log out" />
        </div>
      </nav>
    </section>
  );
}
