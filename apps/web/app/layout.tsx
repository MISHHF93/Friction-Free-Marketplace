import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";
import { publicEnv } from "@/lib/env";
import { PwaRegistrar } from "@/components/pwa-registrar";
import { NativeBridge } from "@/components/native-bridge";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#047857"
};

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
  applicationName: "Friction-Free Marketplace",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FF Marketplace"
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-1024.png", type: "image/png", sizes: "1024x1024" }
    ],
    shortcut: "/icon-1024.png",
    apple: [{ url: "/icon-1024.png", sizes: "1024x1024", type: "image/png" }]
  },
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
        <PwaRegistrar />
        <NativeBridge />
      </body>
    </html>
  );
}
