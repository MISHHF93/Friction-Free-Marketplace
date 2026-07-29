import Link from "next/link";
import { brandProfile } from "@/lib/brand-profile";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "full" | "mark" | "wordmark";
  tone?: "default" | "inverse" | "onDark";
  href?: string | null;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
  markClassName?: string;
  priority?: boolean;
};

const sizeMap = {
  sm: { mark: 28, title: "text-base", tagline: "text-[9px]" },
  md: { mark: 36, title: "text-lg", tagline: "text-[10px]" },
  lg: { mark: 44, title: "text-xl", tagline: "text-[11px]" }
} as const;

/** Inline FF monogram mark — white + lumen blue on ink (or inverse). */
export function BrandMark({
  size = 36,
  tone = "default",
  className
}: {
  size?: number;
  tone?: "default" | "inverse" | "onDark";
  className?: string;
}) {
  const isInverse = tone === "inverse";
  const isOnDark = tone === "onDark";

  const bg = isInverse ? "#FFFFFF" : isOnDark ? "#1B3550" : "#10151C";
  const fg = isInverse ? "#10151C" : "#FFFFFF";
  const accent = "#2B8FF0";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="16" fill={bg} />
      {/* Stylized double-F monogram */}
      <path
        d="M18 18h28v7.5H27.5V29H42v7H27.5v9.5H18V18z"
        fill={fg}
      />
      <circle cx="48" cy="48" r="7" fill={accent} />
      <path
        d="M46.2 48h3.6M48 46.2v3.6"
        stroke={isInverse ? "#FFFFFF" : "#FFFFFF"}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrandLogo({
  variant = "full",
  tone = "default",
  href = "/",
  size = "md",
  showTagline = true,
  className,
  markClassName
}: BrandLogoProps) {
  const dimensions = sizeMap[size];
  const titleColor =
    tone === "onDark" || tone === "inverse" ? "text-white" : "text-foreground";
  const taglineColor =
    tone === "onDark" || tone === "inverse" ? "text-sky-300" : "text-primary";

  const content = (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-2.5 font-black tracking-tight",
        className
      )}
    >
      {variant !== "wordmark" ? (
        <BrandMark size={dimensions.mark} tone={tone === "onDark" ? "onDark" : tone === "inverse" ? "inverse" : "default"} className={markClassName} />
      ) : null}
      {variant !== "mark" ? (
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className={cn("block font-display leading-none", dimensions.title, titleColor)}>
            {brandProfile.productName}
          </span>
          {showTagline ? (
            <span className={cn("mt-1 block font-bold uppercase tracking-[0.18em]", dimensions.tagline, taglineColor)}>
              {brandProfile.tagline}
            </span>
          ) : null}
        </span>
      ) : null}
      {/* Always show compact name on very small screens when full logo */}
      {variant === "full" ? (
        <span className={cn("font-display leading-none sm:hidden", dimensions.title, titleColor)}>
          {brandProfile.monogram}
        </span>
      ) : null}
    </span>
  );

  if (href === null) {
    return content;
  }

  return (
    <Link
      href={href}
      className="brand-focus rounded-xl"
      aria-label={`${brandProfile.legalName} home`}
    >
      {content}
    </Link>
  );
}
