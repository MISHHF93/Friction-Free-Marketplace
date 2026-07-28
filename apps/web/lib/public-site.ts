import {
  BadgeCheck,
  BarChart3,
  Bot,
  Building2,
  Car,
  CheckCircle2,
  CreditCard,
  FileText,
  Headphones,
  Home,
  Laptop,
  LockKeyhole,
  MessageSquare,
  PackageCheck,
  Search,
  ShieldCheck,
  Sofa,
  Sparkles,
  Store,
  Truck,
  Users,
  WalletCards,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type PublicCategory = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  searchHint: string;
  tone: "commerce" | "trust" | "ai" | "premium";
};

export const publicCategories: PublicCategory[] = [
  {
    slug: "vehicles",
    title: "Vehicles",
    description: "Cars, bikes, parts, and transport listings with stronger seller and ownership signals.",
    icon: Car,
    searchHint: "verified commuter car under $12k",
    tone: "commerce",
  },
  {
    slug: "electronics",
    title: "Electronics",
    description: "Phones, laptops, cameras, and devices with condition, serial, and payment readiness details.",
    icon: Laptop,
    searchHint: "mirrorless camera kit under $1,700",
    tone: "ai",
  },
  {
    slug: "furniture",
    title: "Furniture",
    description: "Sofas, tables, decor, and home pieces with pickup windows and delivery context.",
    icon: Sofa,
    searchHint: "modular sofa pickup this weekend",
    tone: "premium",
  },
  {
    slug: "home",
    title: "Home",
    description: "Appliances, tools, storage, and everyday household goods from local sellers.",
    icon: Home,
    searchHint: "washer dryer with delivery",
    tone: "trust",
  },
  {
    slug: "tools",
    title: "Tools",
    description: "Workshop gear, contractor equipment, and power tools with clear condition notes.",
    icon: Wrench,
    searchHint: "cordless drill kit verified seller",
    tone: "commerce",
  },
  {
    slug: "services",
    title: "Services",
    description: "Local help for repairs, moving, setup, and projects with reputation signals.",
    icon: Users,
    searchHint: "insured moving help near me",
    tone: "trust",
  },
  {
    slug: "real-estate",
    title: "Real estate",
    description: "Rooms, rentals, workspaces, and local property services with safer inquiry flows.",
    icon: Building2,
    searchHint: "workspace near downtown",
    tone: "premium",
  },
  {
    slug: "collectibles",
    title: "Collectibles",
    description: "Rare goods, cards, art, and memorabilia with provenance and seller history.",
    icon: BadgeCheck,
    searchHint: "graded cards trusted seller",
    tone: "ai",
  },
];

export const publicNavLinks = [
  { href: "/browse", label: "Browse" },
  { href: "/categories", label: "Categories" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/safety", label: "Safety" },
  { href: "/pricing", label: "Pricing" },
];

export const howItWorksSteps = [
  {
    icon: Search,
    title: "Search with intent",
    description: "Use category, budget, condition, fulfillment, location, and trust filters to narrow the market quickly.",
  },
  {
    icon: ShieldCheck,
    title: "Compare trust signals",
    description: "Review seller verification, transaction history, safety score, listing quality, and payment readiness before contacting anyone.",
  },
  {
    icon: MessageSquare,
    title: "Message with context",
    description: "Ask questions, make offers, counter, and keep important terms connected to the listing and transaction record.",
  },
  {
    icon: CreditCard,
    title: "Use protected checkout",
    description: "Eligible listings can keep payment authorization, receipts, release, refunds, and disputes tied to the order.",
  },
  {
    icon: Truck,
    title: "Complete the handoff",
    description: "Coordinate pickup, delivery, or shipping with clearer expectations and support history.",
  },
];

export const safetyPillars = [
  {
    icon: BadgeCheck,
    title: "Identity and seller signals",
    description: "Profiles, trust scores, transaction counts, and risk levels help buyers understand who they are dealing with.",
  },
  {
    icon: LockKeyhole,
    title: "Protected payment records",
    description: "Checkout, release, refunds, and disputes are connected to the marketplace record for eligible transactions.",
  },
  {
    icon: Bot,
    title: "AI-assisted risk checks",
    description: "Automation helps flag suspicious pricing, duplicate content, unsafe language, and off-platform payment pressure.",
  },
  {
    icon: FileText,
    title: "Human review and audit trails",
    description: "Reports, admin actions, moderation decisions, and trust overrides are designed to leave a reviewable record.",
  },
];

export const pricingPlans = [
  {
    name: "Buyer",
    price: "Free",
    description: "Search, compare, save, message, and buy with transparent seller and listing signals.",
    features: ["AI-assisted search", "Saved searches", "Seller trust signals", "Protected checkout on eligible listings"],
    cta: "Start browsing",
    href: "/browse",
  },
  {
    name: "Seller",
    price: "Success-based",
    description: "Publish higher-quality listings, handle offers, and use payment-ready selling workflows.",
    features: ["Listing assistant", "Offer management", "Seller analytics", "Stripe Connect payouts"],
    cta: "Start selling",
    href: "/dashboard/listings/create",
    highlighted: true,
  },
  {
    name: "Business seller",
    price: "Let’s talk",
    description: "Flexible support for teams managing larger catalogs, frequent sales, or specialized fulfillment.",
    features: ["Team selling workflows", "Catalog planning", "Operational reporting", "Onboarding support"],
    cta: "Talk to our team",
    href: "/contact",
  },
];

export const companyStats = [
  { label: "Marketplace model", value: "Trust-first", detail: "Commerce flows designed around proof, not pressure.", icon: ShieldCheck },
  { label: "Helpful by design", value: "AI-assisted", detail: "Automation supports decisions while people stay in control.", icon: Sparkles },
  { label: "Seller payments", value: "Stripe-ready", detail: "Designed for onboarding, payouts, reporting, and disputes.", icon: WalletCards },
  { label: "Accountability", value: "Traceable", detail: "Important marketplace and trust actions retain clear context.", icon: BarChart3 },
];

export const contactReasons = [
  { label: "Buyer support", description: "Questions about listings, saved searches, offers, or checkout.", icon: Headphones },
  { label: "Seller onboarding", description: "Help with listings, verification, payments, or payout setup.", icon: Store },
  { label: "Safety report", description: "Report suspicious listings, messages, payment requests, or disputes.", icon: ShieldCheck },
  { label: "Partnerships", description: "Commerce, payments, search, AI, or marketplace operations partnerships.", icon: PackageCheck },
];

export function marketplaceJsonLd(path: string, name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: path,
    isPartOf: {
      "@type": "WebSite",
      name: "Friction-Free Marketplace",
      url: "/",
    },
  };
}
