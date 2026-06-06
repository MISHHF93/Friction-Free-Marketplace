import Link from "next/link";
import { ArrowRight, Bot, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListingCard } from "@/components/listing-card";
import { listings } from "@/lib/marketplace-data";

const capabilities = [
  { icon: ShieldCheck, title: "Trust-first trading", text: "Supabase-backed identities, RLS-ready data types, verification signals, and protected workspaces." },
  { icon: CreditCard, title: "Stripe commerce rails", text: "Escrow-friendly checkout and payout hooks are isolated behind server-only Stripe helpers." },
  { icon: Bot, title: "AI-assisted listings", text: "OpenAI SDK setup is ready for listing copy, condition summaries, moderation, and support automations." }
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
        <div className="flex flex-col justify-center">
          <Badge className="w-fit">Production starter</Badge>
          <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
            A friction-free marketplace for trusted local and online commerce.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Launch buyer discovery, seller operations, admin oversight, Supabase auth, Stripe payments, and OpenAI-powered workflows from a clean Next.js App Router foundation.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/browse">Browse listings <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/seller">Start selling</Link>
            </Button>
          </div>
        </div>
        <Card className="overflow-hidden shadow-soft">
          <div className="bg-gradient-to-br from-emerald-200 via-sky-100 to-white p-6">
            <div className="rounded-2xl border border-white/70 bg-white/75 p-5 backdrop-blur">
              <div className="mb-5 flex items-center gap-2 font-bold">
                <Sparkles className="h-5 w-5 text-primary" /> Live marketplace pulse
              </div>
              <div className="grid gap-3">
                {["Identity verified", "Payment authorized", "AI condition summary complete", "Admin risk score: low"].map((item) => (
                  <div key={item} className="rounded-xl bg-background px-4 py-3 text-sm font-medium shadow-sm">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </section>
      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-14 sm:px-6 lg:grid-cols-3 lg:px-8">
        {capabilities.map((capability) => (
          <Card key={capability.title}>
            <CardHeader>
              <capability.icon className="h-6 w-6 text-primary" />
              <CardTitle>{capability.title}</CardTitle>
              <CardDescription>{capability.text}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Featured inventory</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Browse verified listings</h2>
          </div>
          <Button asChild variant="outline"><Link href="/browse">View all</Link></Button>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
      </section>
    </>
  );
}
