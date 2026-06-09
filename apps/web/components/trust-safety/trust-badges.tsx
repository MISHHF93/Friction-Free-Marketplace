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
  standard: "border-slate-200 bg-slate-50 text-slate-700",
  silver: "border-slate-300 bg-slate-100 text-slate-900",
  gold: "border-amber-200 bg-amber-50 text-amber-800",
  platinum: "border-teal-200 bg-teal-50 text-teal-800",
  limited: "border-red-200 bg-red-50 text-red-700"
};

export function TrustBadgeStrip({ badges, className }: { badges: TrustBadgeDefinition[]; className?: string }) {
  if (!badges.length) {
    return <Badge className={cn("border-amber-200 bg-amber-50 text-amber-800", className)}>Verification available</Badge>;
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
  const tone = score >= 85 ? "border-teal-200 bg-teal-50 text-teal-800" : score >= 65 ? "border-blue-200 bg-blue-50 text-blue-800" : score >= 45 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold", tone)}>
      <ShieldCheck className="h-3.5 w-3.5" />
      {label} {Math.round(score)}
    </span>
  );
}
