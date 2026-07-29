import { brandChrome, brandLogoUsage, brandProfile, brandVoice } from "@/lib/brand-profile";

export { brandChrome, brandLogoUsage, brandProfile, brandVoice };

export const designLanguage = {
  name: brandProfile.system,
  version: brandProfile.version,
  direction: "A clean marketplace system built from pure white, light lumen blue, and near-black neutrals with semantic safety colors only when needed.",
  principles: [
    "Solid fills instead of blended color treatments or decorative glass.",
    "White and cool white surfaces own the canvas.",
    "Light lumen blue identifies actions, trust, and intelligence.",
    "Near-black is reserved for text, dark panels, and high-contrast moments.",
    "Warning and risk colors appear only when action is genuinely required.",
    brandLogoUsage.header
  ]
} as const;

export const brandPersonality = {
  promise: "Clear, modern local commerce with useful intelligence and payment-grade trust.",
  traits: ["trustworthy", "modern", "clear", "useful", "safe", "commerce-first"],
  voice: {
    headline: "Confident, clear, and outcome-focused.",
    body: "Plainspoken, reassuring, and specific about safety signals.",
    avoid: ["cheap classifieds language", "hype without proof", "dark-pattern urgency", "overly playful microcopy"]
  }
} as const;

export const brandColorPalette = {
  foundation: {
    ink: "#10151C",
    slate: "#44505E",
    steel: "#687485",
    mist: "#F5F9FD",
    cloud: "#E8F0F8",
    pearl: "#F2F7FC",
    surface: "#FFFFFF"
  },
  commerce: {
    lumenBlue: "#2B8FF0",
    lumenDeep: "#1B3550",
    commerceSoft: "#EAF4FE"
  },
  primary: {
    lumenBlue: "#2B8FF0",
    lumenDeep: "#1B3550",
    lumenSoft: "#EAF4FE"
  },
  intelligence: {
    lumenBlue: "#2482D6",
    lumenDeep: "#15536F",
    aiSoft: "#E8F4FC"
  },
  safety: {
    safeGreen: "#1F9A57",
    warningAmber: "#D97706",
    riskRed: "#DC2626"
  },
  premium: {
    platinum: "#6B7C8D",
    platinumSoft: "#EDF1F5",
    graphite: "#10151C"
  },
  data: {
    lumen: "#2B8FF0",
    harbor: "#2482D6",
    platinum: "#6B7C8D",
    lake: "#39758A",
    berry: "#A54A63"
  }
} as const;

export const typographyScale = {
  display: "clamp(3rem, 8vw, 5.75rem) / 0.92, font-black, -0.05em tracking",
  h1: "clamp(2.5rem, 6vw, 4.5rem) / 0.96, font-black, -0.045em tracking",
  h2: "clamp(2rem, 4vw, 3.25rem) / 1.02, font-black, -0.035em tracking",
  h3: "1.5rem / 1.18, font-bold, -0.02em tracking",
  body: "1rem / 1.7, regular, high readability",
  small: "0.875rem / 1.55, medium for dense commerce metadata",
  label: "0.8125rem / 1.15, bold for labels and compact actions",
  micro: "0.75rem uppercase, 0.22em tracking for trust labels",
  metric: "2rem / 1, black, tabular when numeric"
} as const;

export const spacingScale = {
  pageX: "1rem -> 1.5rem -> 2rem",
  sectionY: "3rem -> 6rem by viewport",
  cardPadding: "1.25rem -> 1.5rem",
  dashboardGap: "1rem -> 1.5rem",
  controlHeight: "2.25rem small, 2.75rem default, 3.25rem large",
  gridGap: "1rem -> 1.25rem -> 1.5rem"
} as const;

export const radiusSystem = {
  control: "0.75rem",
  card: "1rem",
  panel: "1.35rem",
  shell: "1.6rem",
  hero: "2rem",
  pill: "999px"
} as const;

export const shadowSystem = {
  xs: "subtle input and badge lift",
  sm: "default cards",
  md: "elevated panels",
  card: "marketplace cards with cool blue lift on hover",
  glow: "lumen blue glow for AI and focus moments",
  admin: "deep black panel elevation"
} as const;
