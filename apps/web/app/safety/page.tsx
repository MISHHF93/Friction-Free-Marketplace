import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Safety | Friction-Free Marketplace",
  description: "How we keep local buying and selling safer.",
  alternates: { canonical: "/safety" }
};

export default function SafetyPage() {
  return (
    <section className="app-container py-8">
      <h1 className="text-hero text-balance">Safety</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
        Keep payments and conversations in the marketplace. If something feels wrong, report it so there is a record.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Buyers</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
            <p>Review the listing and seller before you pay. Use protected checkout instead of paying off-platform.</p>
            <p>Meet in a public place for pickup, or wait until the item arrives before you confirm receipt.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sellers</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
            <p>Use original photos and accurate descriptions. Keep offers and payment in the app.</p>
            <p>Do not share off-platform payment links. Report suspicious messages from your conversation.</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild><Link href="/contact">Contact safety</Link></Button>
        <Button asChild variant="outline"><Link href="/dashboard/verification">Verification</Link></Button>
      </div>
    </section>
  );
}
