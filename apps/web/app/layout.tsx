import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { headers } from "next/headers";
import { getMarketplaceSession } from "@/lib/auth/session";
import { documentLocale } from "@/lib/i18n/document-locale";
import type { ReactNode } from "react";
import "./globals.css";
import { publicEnv } from "@/lib/env";
import { brandChrome, brandProfile } from "@/lib/brand-profile";
import { PwaRegistrar } from "@/components/pwa-registrar";
import { CspNonceAnchor } from "@/components/security/nonce-script";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: brandChrome.lumenBlue
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
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
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
  other: {
    "msapplication-TileColor": brandChrome.ink
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection();
  const headerStore = await headers();
  const session = await getMarketplaceSession().catch(() => null);
  const locale = documentLocale(session?.locale, headerStore.get("accept-language"));
  return (
    <html lang={locale.lang} dir={locale.dir} suppressHydrationWarning>
      <body>
        {children}
        <CspNonceAnchor />
        <PwaRegistrar />
      </body>
    </html>
  );
}
