/**
 * Friction-Free Marketplace — brand profile
 * Source of truth for product identity, chrome, and logo usage.
 */

export const brandProfile = {
  legalName: "Friction-Free Marketplace",
  productName: "Friction-Free",
  shortName: "FF Marketplace",
  monogram: "FF",
  tagline: "The trusted marketplace",
  promise: "Clear listings, safer payments, and smoother handoffs.",
  domainHint: "friction-free",
  applicationId: "com.frictionfreemarketplace.app",
  system: "Lumen Blue",
  version: "2.0"
} as const;

export const brandVoice = {
  personality: ["trustworthy", "modern", "clear", "calm", "commerce-first"],
  headline: "Confident, clear, and outcome-focused.",
  body: "Plainspoken and specific about trust and payment safety.",
  avoid: ["classifieds slang", "hype without proof", "dark-pattern urgency"]
} as const;

/** Canonical brand colors for assets outside CSS tokens. */
export const brandChrome = {
  white: "#FFFFFF",
  canvas: "#F5F9FD",
  lumenBlue: "#2B8FF0",
  lumenSoft: "#EAF4FE",
  lumenDeep: "#1B3550",
  ink: "#10151C",
  slate: "#44505E",
  border: "#D7E0EA"
} as const;

export const brandLogoUsage = {
  header: "Top-left mark + wordmark (standard product chrome).",
  footer: "Mark + wordmark on dark panels.",
  favicon: "Mark only, high contrast on ink background.",
  pwa: "Maskable mark with safe padding for Android/Chrome.",
  apple: "Rounded square mark for home screen.",
  social: "Mark centered on white or lumen soft canvas.",
  clearSpace: "At least 1/4 of mark height around the logo.",
  minSize: {
    markPx: 24,
    headerMarkPx: 36,
    faviconPx: 16
  },
  doNot: [
    "Stretch or rotate the mark",
    "Recolor the mark off-brand",
    "Place low-contrast blue on blue",
    "Add drop shadows to the primary wordmark"
  ]
} as const;

export const brandAssets = {
  markSvg: "/brand/logo-mark.svg",
  fullSvg: "/brand/logo-full.svg",
  iconSvg: "/icon.svg",
  favicon: "/favicon.ico",
  appleTouchIcon: "/apple-touch-icon.png",
  icon192: "/icons/icon-192.png",
  icon512: "/icons/icon-512.png",
  icon1024: "/icon-1024.png",
  maskable512: "/icons/icon-maskable-512.png"
} as const;

export type BrandLogoVariant = "full" | "mark" | "wordmark";
export type BrandLogoTone = "default" | "inverse" | "onDark";
