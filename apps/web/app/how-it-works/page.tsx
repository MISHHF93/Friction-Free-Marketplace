import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "How it works | Friction-Free Marketplace",
  description: "How buying and selling works, with protected payment.",
  alternates: { canonical: "/how-it-works" }
};

export default function HowItWorksPage() {
  return (
    <section className="app-container py-8">
      <h1 className="text-hero text-balance">How it works</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Buy and sell locally with protected payment. Conversations, offers, and checkout stay in the marketplace.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>For buyers</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Search listings, message the seller, and agree on a price or pickup in the thread.</p>
            <p>Pay in the app. Your payment is held until you confirm you got the item.</p>
            <Button asChild className="mt-2"><Link href="/search">Search listings</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>For sellers</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Create a listing, answer buyer questions, and accept an offer when you are ready.</p>
            <p>Ship or meet in a safe place, then get paid after the buyer confirms receipt.</p>
            <Button asChild variant="outline" className="mt-2"><Link href="/dashboard/listings/create">Create a listing</Link></Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
