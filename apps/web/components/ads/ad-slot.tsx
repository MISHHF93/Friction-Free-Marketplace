import Image from "next/image";
import { AdImpressionBeacon } from "@/components/ads/ad-impression-beacon";
import { adCreativeSrc } from "@/lib/ads/creative-url";
import { AD_PLACEMENTS, type AdPlacementKey } from "@/lib/ads/placements";
import { getCampaignForSlot } from "@/lib/ads/queries";
import { isOutboundAdTarget, resolveAdTarget } from "@/lib/ads/redirect";
import { publicEnv } from "@/lib/env";
import type { AdTargetContext } from "@/lib/ads/types";

export async function AdSlot({
  placement,
  categorySlug,
  belowFold,
  className
}: {
  placement: AdPlacementKey;
  categorySlug?: string | null;
  belowFold?: boolean;
  className?: string;
}) {
  const campaign = await getCampaignForSlot(placement, { categorySlug } satisfies AdTargetContext);
  if (!campaign) return null;

  const src = adCreativeSrc(campaign.image_path);
  if (!src) return null;

  const meta = AD_PLACEMENTS[placement];
  const lazy = belowFold ?? meta.belowFold;
  const href = `/api/ads/click/${campaign.id}`;
  const destination = resolveAdTarget(campaign.target_url, publicEnv.NEXT_PUBLIC_APP_URL);
  const outbound = destination ? isOutboundAdTarget(destination, publicEnv.NEXT_PUBLIC_APP_URL) : false;

  return (
    <aside
      data-ad-slot={placement}
      data-ad-campaign={campaign.id}
      className={["w-full min-w-0", className].filter(Boolean).join(" ")}
      aria-label={`Sponsored: ${campaign.title}`}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sponsored</p>
      <a
        href={href}
        className="block overflow-hidden rounded-2xl border border-border bg-card shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        rel={outbound ? "sponsored noopener" : "sponsored"}
        target={outbound ? "_blank" : undefined}
        referrerPolicy={outbound ? "no-referrer" : undefined}
      >
        <span className="relative block w-full overflow-hidden" style={{ aspectRatio: meta.aspectRatio }}>
          <Image
            src={src}
            alt={campaign.alt_text}
            fill
            sizes="(max-width: 430px) 100vw, (max-width: 80rem) 90vw, 72rem"
            className="object-cover"
            priority={!lazy}
          />
        </span>
        <span className="sr-only">{campaign.title}, advertised by {campaign.advertiser_name}</span>
      </a>
      <AdImpressionBeacon campaignId={campaign.id} />
    </aside>
  );
}
