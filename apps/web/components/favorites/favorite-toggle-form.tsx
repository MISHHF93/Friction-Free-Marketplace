import { Heart } from "lucide-react";
import { toggleFavoriteFormAction } from "@/actions/favorites";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function FavoriteToggleForm({
  listingId,
  isFavorited,
  labelWhenOn = "Saved",
  labelWhenOff = "Save listing",
  className,
  variant = "ghost",
  size
}: {
  listingId: string;
  isFavorited: boolean;
  labelWhenOn?: string;
  labelWhenOff?: string;
  className?: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  if (!isUuid(listingId)) {
    return (
      <Button type="button" variant={variant} size={size} className={cn("favorite-pop", className)} disabled>
        <Heart className="h-4 w-4" />
        Live favorite
      </Button>
    );
  }

  return (
    <form action={toggleFavoriteFormAction}>
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="nextFavorited" value={String(!isFavorited)} />
      <Button type="submit" variant={variant} size={size} className={cn("favorite-pop", className)} aria-pressed={isFavorited}>
        <Heart className={isFavorited ? "h-4 w-4 fill-current" : "h-4 w-4"} />
        {isFavorited ? labelWhenOn : labelWhenOff}
      </Button>
    </form>
  );
}
