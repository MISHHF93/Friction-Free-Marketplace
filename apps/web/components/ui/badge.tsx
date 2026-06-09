import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border font-bold tracking-[-0.01em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-secondary-foreground",
        trust: "border-trust-border bg-trust-soft text-trust",
        ai: "border-ai-border bg-ai-soft text-ai",
        safety: "border-emerald-200 bg-safety-soft text-safety",
        warning: "border-amber-200 bg-amber-50 text-amber-800",
        risk: "border-red-200 bg-red-50 text-red-700",
        premium: "border-amber-200 bg-premium-soft text-premium-foreground",
        dark: "border-white/10 bg-white/10 text-white"
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        default: "px-3 py-1 text-xs",
        lg: "px-3.5 py-1.5 text-sm"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  );
}
