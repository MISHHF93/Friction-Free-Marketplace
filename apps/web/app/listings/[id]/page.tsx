import Link from "next/link";
import { notFound } from "next/navigation";
import { Heart, MessageSquare, ShieldCheck, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listings } from "@/lib/marketplace-data";

export function generateStaticParams() {
  return listings.map((listing) => ({ id: listing.id }));
}

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const listing = listings.find((item) => item.id === params.id);

  if (!listing) {
    notFound();
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
      <div>
        <div className={`h-[420px] rounded-3xl border border-border bg-gradient-to-br ${listing.image}`} />
        <Card className="mt-6">
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>{listing.description}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {listing.highlights.map((highlight) => (
                <div key={highlight} className="rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-foreground">{highlight}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <Card className="shadow-soft">
          <CardHeader>
            <Badge className="w-fit">{listing.condition}</Badge>
            <h1 className="text-3xl font-black tracking-tight">{listing.title}</h1>
            <p className="text-3xl font-bold">${listing.price.toLocaleString()}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl bg-secondary p-4 text-sm">
              <p className="font-semibold">Sold by {listing.seller}</p>
              <p className="mt-1 flex items-center gap-1 text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Trust score {listing.trustScore}</p>
            </div>
            <div className="grid gap-3">
              <Button size="lg">Buy with escrow</Button>
              <Button variant="outline" size="lg"><MessageSquare className="h-4 w-4" /> Message seller</Button>
              <Button variant="ghost"><Heart className="h-4 w-4" /> Save listing</Button>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Truck className="h-4 w-4" /> Shipping, pickup, and payout protection are coordinated after checkout.</p>
            <Button asChild variant="outline" className="w-full"><Link href="/browse">Back to browse</Link></Button>
          </CardContent>
        </Card>
      </aside>
    </section>
  );
}
