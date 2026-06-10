import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "status-badge",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-secondary-foreground",
        trust: "status-trust",
        ai: "status-ai",
        safety: "status-safety",
        warning: "status-warning",
        risk: "status-risk",
        premium: "status-premium",
        dark: "border-white/10 bg-white/10 text-white"
      },
      size: {
        sm: "status-badge-sm",
        default: "",
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
