import type { Metadata } from "next";
import { DiscoveryPage } from "@/components/search/discovery-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse listings | Friction-Free Marketplace",
  description: "Browse active marketplace listings with category, price, condition, location, and trusted-seller filters.",
  alternates: { canonical: "/browse" },
  openGraph: {
    title: "Browse trusted marketplace listings",
    description: "Find verified sellers and protected checkout-ready inventory across marketplace categories.",
    url: "/browse"
  }
};

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <DiscoveryPage searchParams={await searchParams} mode="browse" />;
}
