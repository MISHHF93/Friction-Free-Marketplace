import { DiscoveryPage } from "@/components/search/discovery-page";

export default function BrowsePage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  return <DiscoveryPage searchParams={searchParams} mode="browse" />;
}
