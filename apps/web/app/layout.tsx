import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";
import { publicEnv } from "@/lib/env";
import { brandChrome, brandProfile } from "@/lib/brand-profile";
import { PwaRegistrar } from "@/components/pwa-registrar";
import { NativeBridge } from "@/components/native-bridge";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brandChrome.lumenBlue },
    { media: "(prefers-color-scheme: dark)", color: brandChrome.ink }
  ]
};

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
  applicationName: brandProfile.legalName,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: brandProfile.shortName
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    shortcut: "/favicon.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      { rel: "mask-icon", url: "/brand/logo-mark.svg", color: brandChrome.lumenBlue }
    ]
  },
  title: {
    default: `${brandProfile.legalName} | ${brandProfile.tagline}`,
    template: `%s | ${brandProfile.legalName}`
  },
  description: brandProfile.promise,
  keywords: ["AI marketplace", "trusted commerce", "protected checkout", "seller tools", "local marketplace", "marketplace safety"],
  alternates: { canonical: "/" },
  openGraph: {
    title: `${brandProfile.legalName} | ${brandProfile.tagline}`,
    description: brandProfile.promise,
    url: "/",
    siteName: brandProfile.legalName,
    type: "website",
    images: [{ url: "/icon-1024.png", width: 1024, height: 1024, alt: brandProfile.legalName }]
  },
  twitter: {
    card: "summary",
    title: brandProfile.legalName,
    description: brandProfile.promise,
    images: ["/icon-1024.png"]
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
      <head>
        <link rel="icon" href="/favicon.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content={brandChrome.lumenBlue} />
        <meta name="msapplication-TileColor" content={brandChrome.ink} />
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
        <PwaRegistrar />
        <NativeBridge />
      </body>
    </html>
  );
}
