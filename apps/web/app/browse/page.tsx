import type { Metadata } from "next";
import { DiscoveryPage } from "@/components/search/discovery-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse marketplace listings | Friction-Free Marketplace",
  description: "Browse premium marketplace listings with category navigation, trust-forward filters, AI assistance, saved searches, and protected checkout signals.",
  alternates: { canonical: "/browse" },
  openGraph: {
    title: "Browse premium marketplace listings",
    description: "Find trusted sellers and commerce-ready inventory across categories with modern marketplace filters.",
    url: "/browse",
  },
};

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <DiscoveryPage searchParams={await searchParams} mode="browse" />;
}
