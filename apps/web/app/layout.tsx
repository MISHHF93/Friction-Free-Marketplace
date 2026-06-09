import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
  applicationName: "Friction-Free Marketplace",
  title: {
    default: "Friction-Free Marketplace | AI-powered trusted commerce",
    template: "%s | Friction-Free Marketplace"
  },
  description: "Buy and sell with AI-assisted discovery, professional seller tools, protected checkout, trust signals, and marketplace safety workflows.",
  keywords: ["AI marketplace", "trusted commerce", "protected checkout", "seller tools", "local marketplace", "marketplace safety"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Friction-Free Marketplace | AI-powered trusted commerce",
    description: "A premium marketplace platform for clearer listings, safer payments, professional sellers, and AI-assisted commerce.",
    url: "/",
    siteName: "Friction-Free Marketplace",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Friction-Free Marketplace",
    description: "AI-powered trusted commerce for buyers, sellers, and marketplace operators."
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
