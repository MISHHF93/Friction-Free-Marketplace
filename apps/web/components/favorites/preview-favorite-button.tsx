"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PreviewFavoriteButton({
  className,
  variant = "ghost",
  size
}: {
  className?: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const [saved, setSaved] = useState(false);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("favorite-pop", className)}
      aria-pressed={saved}
      onClick={() => setSaved((current) => !current)}
    >
      <Heart className={saved ? "h-4 w-4 fill-current" : "h-4 w-4"} />
      {saved ? "Saved" : "Save listing"}
    </Button>
  );
}
