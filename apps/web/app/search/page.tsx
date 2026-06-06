import type { Metadata } from "next";
import { DiscoveryPage } from "@/components/search/discovery-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search results | Friction-Free Marketplace",
  description: "Search marketplace listings by keyword, location, category, seller trust, and AI-assisted buyer intent.",
  alternates: { canonical: "/search" },
  openGraph: {
    title: "Search trusted marketplace listings",
    description: "Use marketplace search and trust signals to compare safe listings faster.",
    url: "/search"
  }
};

export default function SearchPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  return <DiscoveryPage searchParams={searchParams} mode="search" />;
}
