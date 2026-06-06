import { Search, SlidersHorizontal } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories, listings } from "@/lib/marketplace-data";

export default function BrowsePage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <Badge>Marketplace</Badge>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Browse listings</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Search trusted sellers, escrow-backed items, AI-verified media, and shipment-ready offers.</p>
        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search bikes, sofas, cameras..." />
          </div>
          <Button variant="outline"><SlidersHorizontal className="h-4 w-4" /> Filters</Button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((category) => <Badge key={category}>{category}</Badge>)}
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
      </div>
    </section>
  );
}
