import { AlertTriangle, BadgeCheck, IdCard, MailCheck, PhoneCall, ShieldCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TrustBadgeDefinition } from "@/lib/trust-safety/engine";

const icons = {
  "mail-check": MailCheck,
  "phone-check": PhoneCall,
  "id-card": IdCard,
  "shield-check": ShieldCheck,
  star: Star,
  "alert-triangle": AlertTriangle
} as const;

const levelClasses = {
  standard: "border-border bg-secondary text-secondary-foreground",
  silver: "border-ai-border bg-ai-soft text-ai",
  gold: "border-premium-border bg-premium-soft text-premium-foreground",
  platinum: "border-trust-border bg-trust-soft text-trust",
  limited: "border-safety-risk-border bg-safety-risk-soft text-safety-risk"
};

export function TrustBadgeStrip({ badges, className }: { badges: TrustBadgeDefinition[]; className?: string }) {
  if (!badges.length) {
    return <Badge variant="warning" className={className}>Verification available</Badge>;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {badges.map((badge, index) => {
        const Icon = icons[badge.icon] ?? BadgeCheck;
        return (
          <span
            className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold", levelClasses[badge.level])}
            key={`${badge.code}-${index}`}
            title={badge.description}
          >
            <Icon className="h-3.5 w-3.5" />
            {badge.label}
          </span>
        );
      })}
    </div>
  );
}

export function TrustScoreBadge({ score, label = "Trust" }: { score: number; label?: string }) {
  const tone = score >= 85 ? "status-trust" : score >= 65 ? "status-ai" : score >= 45 ? "status-warning" : "status-risk";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold", tone)}>
      <ShieldCheck className="h-3.5 w-3.5" />
      {label} {Math.round(score)}
    </span>
  );
}
