import Link from "next/link";
import { notFound } from "next/navigation";
import { Heart, MessageSquare, ShieldCheck, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { listings } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return listings.map((listing) => ({ id: listing.id }));
}

type DbListing = {
  id: string;
  title: string;
  description: string;
  condition: string | null;
  price_amount: number;
  currency: string;
  location_city: string | null;
  location_region: string | null;
  ships_to: string[];
  pickup_available: boolean;
  metadata: Record<string, unknown> | null;
  listing_images?: Array<{ public_url: string | null; alt_text: string | null }>;
};

async function getDatabaseListing(id: string) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("listings")
      .select("id,title,description,condition,price_amount,currency,location_city,location_region,ships_to,pickup_available,metadata,listing_images(public_url,alt_text)")
      .eq("id", id)
      .eq("status", "active")
      .is("deleted_at", null)
      .single();
    if (error) return null;
    return data as DbListing;
  } catch {
    return null;
  }
}

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const dbListing = await getDatabaseListing(params.id);

  if (dbListing) {
    const seoTags = Array.isArray(dbListing.metadata?.seo_tags) ? dbListing.metadata.seo_tags.filter((tag): tag is string => typeof tag === "string") : [];
    const moderationStatus = typeof dbListing.metadata?.moderation_status === "string" ? dbListing.metadata.moderation_status : "pending";
    const fraudScore = typeof (dbListing.metadata?.ai_listing as Record<string, unknown> | undefined)?.fraudRiskScore === "number" ? (dbListing.metadata?.ai_listing as { fraudRiskScore: number }).fraudRiskScore : null;

    return (
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <div>
          {dbListing.listing_images?.[0]?.public_url ? (
            <img src={dbListing.listing_images[0].public_url} alt={dbListing.listing_images[0].alt_text || dbListing.title} className="h-[420px] w-full rounded-3xl border border-border object-cover" />
          ) : (
            <div className="h-[420px] rounded-3xl border border-border bg-gradient-to-br from-slate-100 to-white" />
          )}
          <Card className="mt-6">
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>{dbListing.description}</p>
              {seoTags.length > 0 && <div className="flex flex-wrap gap-2">{seoTags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>}
            </CardContent>
          </Card>
        </div>
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex flex-wrap gap-2"><Badge>{dbListing.condition ?? "condition pending"}</Badge><Badge>moderation: {moderationStatus}</Badge></div>
              <h1 className="text-3xl font-black tracking-tight">{dbListing.title}</h1>
              <p className="text-3xl font-bold">{dbListing.currency} ${Number(dbListing.price_amount).toLocaleString()}</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl bg-secondary p-4 text-sm">
                <p className="font-semibold">Location: {[dbListing.location_city, dbListing.location_region].filter(Boolean).join(", ") || "Ask seller"}</p>
                <p className="mt-1 flex items-center gap-1 text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> {fraudScore === null ? "Fraud screening pending" : `AI fraud risk ${fraudScore}/100`}</p>
              </div>
              <div className="grid gap-3">
                <Button size="lg">Buy with escrow</Button>
                <Button variant="outline" size="lg"><MessageSquare className="h-4 w-4" /> Message seller</Button>
                <Button variant="ghost"><Heart className="h-4 w-4" /> Save listing</Button>
              </div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Truck className="h-4 w-4" /> {dbListing.pickup_available ? "Pickup available." : "Pickup not selected."} {dbListing.ships_to.length ? `Ships to ${dbListing.ships_to.join(", ")}.` : "Shipping not selected."}</p>
              <Button asChild variant="outline" className="w-full"><Link href="/browse">Back to browse</Link></Button>
            </CardContent>
          </Card>
        </aside>
      </section>
    );
  }

  const listing = listings.find((item) => item.id === params.id);
  if (!listing) notFound();

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
