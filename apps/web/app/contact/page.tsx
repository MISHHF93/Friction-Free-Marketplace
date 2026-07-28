import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, MessageSquare, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactForm } from "@/components/contact-form";
import { EmptyState } from "@/components/ui-library";
import { contactReasons, marketplaceJsonLd } from "@/lib/public-site";
import { env } from "@/lib/env.server";

export const metadata: Metadata = {
  title: "Contact | Friction-Free Marketplace",
  description: "Contact Friction-Free Marketplace for buyer support, seller onboarding, trust and safety concerns, partnerships, or platform questions.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Friction-Free Marketplace",
    description: "Reach the marketplace team for support, safety, seller onboarding, or partnerships.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(marketplaceJsonLd("/contact", "Contact", metadata.description ?? "")) }}
      />

      <section className="app-container py-section-sm">
        <div className="rounded-shell border border-border bg-card p-6 shadow-panel sm:p-8 lg:p-10">
          <Badge variant="trust" className="w-fit">Contact</Badge>
          <h1 className="mt-5 max-w-4xl text-hero">Reach the right marketplace team with the right context.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
            Use this page for buyer support, seller onboarding, safety concerns, platform partnerships, or questions about AI-powered commerce workflows.
          </p>
        </div>
      </section>

      <section className="app-container section-y">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {contactReasons.map((reason) => (
            <Card key={reason.label} className="card-interactive">
              <CardHeader>
                <span className="brand-icon brand-icon-ai">
                  <reason.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <CardTitle>{reason.label}</CardTitle>
                <CardDescription>{reason.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="app-container section-y">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
          <Card>
            <CardHeader>
              <Badge variant="premium" className="w-fit">Contact form</Badge>
              <CardTitle>Tell us what you need.</CardTitle>
              <CardDescription>
                Messages are delivered to the configured marketplace support inbox. Keep sensitive payment details out of free-text fields.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContactForm />
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <EmptyState
              tone="trust"
              icon={<ShieldCheck className="h-7 w-7" aria-hidden="true" />}
              title="Safety concerns"
              description="If you see suspicious listings, counterfeit claims, off-platform payment pressure, or unsafe messages, contact safety with the relevant marketplace link."
              action={<Button asChild variant="destructive"><Link href="/safety">Review safety guidance</Link></Button>}
            />
            <Card className="card-ai">
              <CardHeader>
                <span className="brand-icon brand-icon-ai">
                  <Mail className="h-5 w-5" aria-hidden="true" />
                </span>
                <CardTitle>Prefer email?</CardTitle>
                <CardDescription>
                  Email support directly if the form is unavailable.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link href={`mailto:${env.SUPPORT_EMAIL}`}>
                    {env.SUPPORT_EMAIL} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <span className="brand-icon brand-icon-commerce">
                  <MessageSquare className="h-5 w-5" aria-hidden="true" />
                </span>
                <CardTitle>Existing transaction?</CardTitle>
                <CardDescription>
                  For buyer or seller issues, the best support context usually lives inside the related message, offer, listing, or payment record.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
