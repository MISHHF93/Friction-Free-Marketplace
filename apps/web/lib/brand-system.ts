export const brandPersonality = {
  promise: "Premium local commerce with AI convenience and payment-grade trust.",
  traits: ["trusted", "fast", "intelligent", "protective", "polished", "local"],
  voice: {
    headline: "Confident, clear, and outcome-focused.",
    body: "Plainspoken, reassuring, and specific about safety signals.",
    avoid: ["cheap classifieds language", "hype without proof", "dark-pattern urgency", "overly playful microcopy"]
  }
} as const;

export const brandColorPalette = {
  foundation: {
    ink: "#0B1220",
    slate: "#334155",
    mist: "#F8FAFC",
    cloud: "#EEF4F8",
    surface: "#FFFFFF"
  },
  primary: {
    trustTeal: "#0F8F7E",
    trustTealDeep: "#0B5F59",
    trustTealSoft: "#DDF8F1"
  },
  intelligence: {
    aiBlue: "#2563EB",
    aiIndigo: "#4F46E5",
    aiSoft: "#EAF1FF"
  },
  safety: {
    safeGreen: "#16A34A",
    warningAmber: "#D97706",
    riskRed: "#DC2626"
  },
  premium: {
    gold: "#D6A84F",
    champagne: "#FFF6DD",
    graphite: "#111827"
  }
} as const;

export const typographyScale = {
  display: "clamp(3rem, 8vw, 5.75rem) / 0.92, font-black, -0.05em tracking",
  h1: "clamp(2.5rem, 6vw, 4.5rem) / 0.96, font-black, -0.045em tracking",
  h2: "clamp(2rem, 4vw, 3.25rem) / 1.02, font-black, -0.035em tracking",
  h3: "1.5rem / 1.18, font-bold, -0.02em tracking",
  body: "1rem / 1.7, regular, high readability",
  small: "0.875rem / 1.55, medium for dense commerce metadata",
  micro: "0.75rem uppercase, 0.18em tracking for trust labels"
} as const;

export const spacingScale = {
  pageX: "1rem -> 1.5rem -> 2rem",
  sectionY: "3rem -> 4rem -> 5rem",
  cardPadding: "1.25rem -> 1.5rem -> 2rem",
  controlHeight: "2.5rem small, 2.875rem default, 3.25rem large",
  gridGap: "1rem -> 1.25rem -> 1.5rem"
} as const;

export const radiusSystem = {
  control: "0.875rem",
  card: "1.5rem",
  panel: "2rem",
  hero: "2.5rem",
  pill: "999px"
} as const;

export const shadowSystem = {
  xs: "subtle input and badge lift",
  sm: "default cards",
  md: "navigation and elevated controls",
  soft: "premium marketplace cards",
  glow: "AI/trust focus areas",
  trust: "high-value protected commerce surfaces"
} as const;

export const componentStyleRules = {
  icons: [
    "Use lucide-react with 1.75px to 2px visual weight.",
    "Pair icons with labels for important actions; icon-only controls need aria-label.",
    "Use teal for trust, blue/indigo for AI, amber/red only for warning/risk."
  ],
  buttons: [
    "Primary buttons are dark-to-teal premium gradients with soft lift.",
    "Secondary buttons feel like calm surfaces, not gray classifieds controls.",
    "Danger buttons are reserved for irreversible or risk workflows."
  ],
  cards: [
    "Use rounded premium panels, soft borders, and light glass surfaces.",
    "Listing cards prioritize image, price, trust, condition, and payment readiness.",
    "Admin cards use denser spacing and stronger information hierarchy."
  ],
  forms: [
    "Inputs are rounded, 46px default height, with strong focus rings.",
    "Search inputs feel AI-assisted with contextual helper text.",
    "Labels are clear, compact, and never rely on placeholder-only instructions."
  ],
  badges: [
    "Trust badges are green/teal; AI badges are blue; warnings are amber; risk is red.",
    "Badges should communicate proof, status, or routing rather than decoration."
  ],
  navigation: [
    "Header is utility-first: location, search, categories, sell, messages, alerts, account.",
    "Mobile navigation keeps search and sell actions visible without crowding."
  ],
  dashboard: [
    "Dashboards use protected-workspace language, metrics, cards, and clear action clusters.",
    "Dense areas should still feel calm through spacing, section headers, and status badges."
  ],
  admin: [
    "Admin UI should feel like an operations console: dark headers, clear permissions, audited actions.",
    "Risk and moderation surfaces use severity color sparingly and consistently."
  ]
} as const;

export const brandSystem = {
  brandPersonality,
  brandColorPalette,
  typographyScale,
  spacingScale,
  radiusSystem,
  shadowSystem,
  componentStyleRules
} as const;
