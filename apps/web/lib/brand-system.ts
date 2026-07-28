export const designLanguage = {
  name: "Harbor & Pine",
  version: "1.0",
  direction: "A flagship solid-color marketplace system built from evergreen, marine blue, porcelain, platinum, and semantic safety colors.",
  principles: [
    "Solid fills instead of blended color treatments or decorative glass.",
    "Evergreen owns commerce and trust.",
    "Marine blue identifies intelligence, guidance, and neutral analysis.",
    "Platinum is reserved for premium proof and elevated neutral moments.",
    "Warning and risk colors appear only when action is genuinely required."
  ]
} as const;

export const brandPersonality = {
  promise: "Warm, clear local commerce with useful intelligence and payment-grade trust.",
  traits: ["trustworthy", "human", "editorial", "useful", "safe", "commerce-first"],
  voice: {
    headline: "Confident, clear, and outcome-focused.",
    body: "Plainspoken, reassuring, and specific about safety signals.",
    avoid: ["cheap classifieds language", "hype without proof", "dark-pattern urgency", "overly playful microcopy"]
  }
} as const;

export const brandColorPalette = {
  foundation: {
    ink: "#142C22",
    slate: "#3D574B",
    steel: "#69766F",
    mist: "#FAF7EF",
    cloud: "#EEE9DD",
    pearl: "#F8F4EA",
    surface: "#FDFBF6"
  },
  commerce: {
    marketplaceTeal: "#216345",
    marketplaceDeep: "#173F30",
    commerceSoft: "#E6EEE7"
  },
  primary: {
    trustTeal: "#216345",
    trustTealDeep: "#173F30",
    trustTealSoft: "#E6EEE7"
  },
  intelligence: {
    harborBlue: "#1D6F93",
    harborBlueDeep: "#15536F",
    aiSoft: "#E5F0F4"
  },
  safety: {
    safeGreen: "#16A34A",
    warningAmber: "#D97706",
    riskRed: "#DC2626"
  },
  premium: {
    platinum: "#7C929D",
    platinumSoft: "#E9EFF1",
    graphite: "#142C22"
  },
  data: {
    forest: "#216345",
    harbor: "#1D6F93",
    platinum: "#7C929D",
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
  md: "navigation and elevated controls",
  soft: "premium marketplace cards",
  glow: "AI/trust focus areas",
  trust: "high-value protected commerce surfaces",
  ai: "AI-assisted surfaces and tool panels",
  commerce: "primary commerce actions and conversion moments",
  danger: "destructive, fraud, and risk workflows",
  admin: "operations console surfaces"
} as const;

export const componentStyleRules = {
  icons: [
    "Use lucide-react with 1.75px to 2px visual weight and the brand-icon classes for framed icons.",
    "Pair icons with labels for important actions; icon-only controls need aria-label.",
    "Use evergreen for trust, marine blue for AI, and amber/red only for warning/risk."
  ],
  buttons: [
    "Primary buttons use a solid forest fill and are reserved for high-confidence purchase, sell, and continue actions.",
    "Secondary buttons feel like calm surfaces, not gray classifieds controls.",
    "AI, trust, premium, and destructive variants are semantically meaningful, not decorative.",
    "Danger buttons are reserved for irreversible or risk workflows."
  ],
  cards: [
    "Use card-base for default panels and card-interactive only for clickable cards.",
    "Listing cards prioritize image, price, trust, condition, and payment readiness.",
    "Admin cards use denser spacing and stronger information hierarchy."
  ],
  tables: [
    "Use table-shell or table-scroll around table-base for all dense operational data.",
    "Use tabular numeric alignment for money, counts, percentages, and SLA values.",
    "Rows highlight on hover, and selected rows use AI-soft to avoid alarm fatigue."
  ],
  forms: [
    "Inputs use form-control, rounded controls, 44px minimum touch target, and strong focus rings.",
    "Search inputs feel AI-assisted with contextual helper text.",
    "Labels are clear, compact, and never rely on placeholder-only instructions."
  ],
  badges: [
    "Trust badges are evergreen; AI badges are marine blue; warnings are amber; risk is red.",
    "Badges should communicate proof, status, or routing rather than decoration."
  ],
  navigation: [
    "Header is utility-first: location, search, categories, sell, messages, alerts, account.",
    "Mobile navigation keeps search and sell actions visible without crowding."
  ],
  dashboard: [
    "Dashboards use dashboard-shell, dashboard-hero, dashboard-grid, and dashboard-stat for protected workspace consistency.",
    "Dense areas should still feel calm through spacing, section headers, and status badges."
  ],
  admin: [
    "Admin UI should feel like an operations console: dark headers, clear permissions, audited actions.",
    "Risk and moderation surfaces use severity color sparingly and consistently."
  ]
} as const;

export const brandSystem = {
  designLanguage,
  brandPersonality,
  brandColorPalette,
  typographyScale,
  spacingScale,
  radiusSystem,
  shadowSystem,
  componentStyleRules
} as const;
