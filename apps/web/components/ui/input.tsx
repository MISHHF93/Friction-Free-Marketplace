import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-input bg-card/90 px-3.5 py-2 text-sm shadow-xs outline-none ring-offset-background transition placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-semibold",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";
