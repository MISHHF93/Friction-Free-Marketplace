import Link from "next/link";
import { MapPin, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TrustScoreBadge } from "@/components/trust-safety/trust-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listings } from "@/lib/marketplace-data";

export function ListingCard({ listing }: { listing: (typeof listings)[number] }) {
  return (
    <Card className="overflow-hidden">
      <div className="h-44 bg-secondary" />
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge>{listing.category}</Badge>
            <h3 className="mt-3 text-lg font-bold tracking-tight">{listing.title}</h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {listing.location}
            </p>
          </div>
          <p className="text-xl font-bold">${listing.price.toLocaleString()}</p>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-sm">
          <span className="flex items-center gap-1 font-medium">
            <ShieldCheck className="h-4 w-4 text-primary" /> Protected seller
          </span>
          <TrustScoreBadge score={listing.trustScore} />
          <span className="text-muted-foreground">{listing.condition}</span>
        </div>
        <Button asChild className="w-full">
          <Link href={`/listings/${listing.id}`}>View details</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
