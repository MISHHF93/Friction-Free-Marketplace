import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "form-control file:border-0 file:bg-transparent file:text-sm file:font-semibold",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";
