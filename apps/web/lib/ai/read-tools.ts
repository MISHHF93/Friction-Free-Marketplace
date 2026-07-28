import { getListingById } from "@/lib/public-marketplace";
import { searchMarketplace } from "@/lib/search/discovery";

export type AgentToolExecution = {
  tool: string;
  arguments: Record<string, unknown>;
  ok: boolean;
  result: unknown;
};

const executableReadTools = new Set([
  "search_listings",
  "recommend_listings",
  "get_listing_context",
  "compare_listings",
  "estimate_price",
]);

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function listingSummary(listing: Awaited<ReturnType<typeof getListingById>>) {
  if (!listing) return null;
  return {
    id: listing.id,
    title: listing.title,
    price: listing.price_amount,
    currency: listing.currency,
    condition: listing.condition,
    category: listing.category_name,
    location: listing.location_label,
    seller: listing.seller_display_name,
    sellerTrustScore: listing.seller_trust_score,
    sellerRiskLevel: listing.seller_fraud_risk_level,
    fulfillmentModes: listing.fulfillment_modes,
    safetyScore: listing.safety_score,
    valueScore: listing.value_score,
  };
}

export async function executeMarketplaceReadTool(
  tool: string,
  args: Record<string, unknown>,
): Promise<AgentToolExecution> {
  if (!executableReadTools.has(tool)) {
    return {
      tool,
      arguments: args,
      ok: false,
      result: {
        error: "This action was not executed. Write, payment, moderation, and escalation actions require explicit confirmation.",
      },
    };
  }

  try {
    if (tool === "get_listing_context") {
      const listing = await getListingById(text(args.listingId, 100));
      return { tool, arguments: args, ok: Boolean(listing), result: listingSummary(listing) ?? { error: "Listing not found." } };
    }

    if (tool === "compare_listings") {
      const ids = Array.isArray(args.listingIds)
        ? args.listingIds.map((id) => text(id, 100)).filter(Boolean).slice(0, 6)
        : [];
      const listings = await Promise.all(ids.map((id) => getListingById(id)));
      return {
        tool,
        arguments: args,
        ok: listings.some(Boolean),
        result: listings.map(listingSummary).filter(Boolean),
      };
    }

    const query = text(args.query ?? args.itemSummary, 500);
    const requestedLimit = Number(args.limit);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(8, Math.floor(requestedLimit))) : 6;
    const search = await searchMarketplace({
      q: query || undefined,
      sort: tool === "recommend_listings" ? "recommended" : tool === "estimate_price" ? "best_value" : "newest",
      limit,
    });
    const summaries = search.listings.map(listingSummary);

    if (tool === "estimate_price") {
      const prices = search.listings.map((listing) => listing.price_amount).filter(Number.isFinite);
      return {
        tool,
        arguments: args,
        ok: prices.length > 0,
        result: {
          query,
          currency: search.listings[0]?.currency ?? "USD",
          comparableCount: prices.length,
          observedMin: prices.length ? Math.min(...prices) : null,
          observedMax: prices.length ? Math.max(...prices) : null,
          source: search.source,
          comparables: summaries,
          caveat: "Observed active listing prices are context, not completed-sale appraisals.",
        },
      };
    }

    return {
      tool,
      arguments: args,
      ok: true,
      result: { source: search.source, total: search.total, listings: summaries },
    };
  } catch {
    return {
      tool,
      arguments: args,
      ok: false,
      result: { error: "The read-only marketplace lookup failed." },
    };
  }
}
