import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "ui-button",
  {
    variants: {
      variant: {
        default: "ui-button-primary",
        secondary: "ui-button-secondary",
        outline: "ui-button-outline",
        ghost: "ui-button-ghost",
        destructive: "ui-button-destructive",
        premium: "ui-button-premium",
        ai: "ui-button-ai",
        trust: "ui-button-trust",
        surface: "ui-button-surface"
      },
      size: {
        default: "",
        sm: "ui-button-sm",
        lg: "ui-button-lg",
        xl: "ui-button-xl",
        icon: "ui-button-icon"
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
