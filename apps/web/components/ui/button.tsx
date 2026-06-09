import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold tracking-[-0.01em] transition-all duration-200 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 data-[loading=true]:cursor-wait",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-trust to-ai text-white shadow-trust hover:-translate-y-0.5 hover:shadow-glow",
        secondary: "border border-border bg-card text-foreground shadow-xs hover:-translate-y-0.5 hover:bg-secondary hover:shadow-sm",
        outline: "border border-border bg-card/80 text-foreground shadow-xs backdrop-blur hover:-translate-y-0.5 hover:border-primary/40 hover:bg-trust-soft",
        ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:-translate-y-0.5 hover:bg-destructive/90",
        premium: "bg-premium text-premium-foreground shadow-md hover:-translate-y-0.5 hover:bg-premium/90",
        ai: "bg-ai text-ai-foreground shadow-glow hover:-translate-y-0.5 hover:bg-ai/90",
        trust: "bg-trust text-trust-foreground shadow-trust hover:-translate-y-0.5 hover:bg-trust/90",
        surface: "border border-border bg-white/80 text-foreground shadow-sm backdrop-blur hover:-translate-y-0.5 hover:shadow-md"
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-2xl px-8 py-3 text-base",
        xl: "h-14 rounded-2xl px-10 text-base",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, loadingText, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          aria-busy={isLoading || undefined}
          data-loading={isLoading ? "true" : undefined}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        aria-busy={isLoading || undefined}
        data-loading={isLoading ? "true" : undefined}
        disabled={!asChild ? disabled || isLoading : disabled}
        {...props}
      >
        {isLoading && !asChild ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {isLoading && loadingText ? loadingText : children}
      </Comp>
    );
  }
);
Button.displayName = "Button";
