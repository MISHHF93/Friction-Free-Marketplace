import { z } from "zod";
import { getListingById, getPublicCategories, getSellerProfile } from "@/lib/public-marketplace";
import { searchMarketplace } from "@/lib/search/discovery";

const searchInput = z.object({
  query: z.string().trim().max(200).optional(),
  category: z.string().trim().max(80).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  location: z.string().trim().max(120).optional()
});

const idInput = z.object({ id: z.string().trim().min(1).max(80) });

export const mcpTools = ["search_listings", "get_listing", "get_seller_public_profile", "list_categories"] as const;

function publicListing(listing: {
  id: string;
  title: string;
  price_amount: number;
  currency: string;
  category_name: string;
  condition: string;
  location_label: string | null;
  seller_display_name: string;
  seller_id: string;
}) {
  return {
    id: listing.id,
    title: listing.title,
    price: listing.price_amount,
    currency: listing.currency,
    category: listing.category_name,
    condition: listing.condition,
    location: listing.location_label,
    sellerName: listing.seller_display_name,
    sellerId: listing.seller_id
  };
}

export async function runMcpTool(name: string, rawInput: unknown) {
  if (name === "search_listings") {
    const input = searchInput.parse(rawInput ?? {});
    const result = await searchMarketplace({
      q: input.query,
      category: input.category,
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
      location: input.location,
      limit: 12
    });
    return {
      total: result.total,
      source: result.source,
      listings: result.listings.map(publicListing)
    };
  }

  if (name === "get_listing") {
    const input = idInput.parse(rawInput ?? {});
    const listing = await getListingById(input.id);
    return listing ? publicListing(listing) : null;
  }

  if (name === "get_seller_public_profile") {
    const input = idInput.parse(rawInput ?? {});
    const { seller, listings } = await getSellerProfile(input.id);
    if (!seller) return null;
    return {
      id: seller.id,
      displayName: seller.displayName,
      username: seller.username,
      bio: seller.bio,
      avatarUrl: seller.avatarUrl,
      locationLabel: seller.locationLabel,
      headline: seller.headline,
      trustScore: seller.trustScore,
      listings: listings.map(publicListing)
    };
  }

  if (name === "list_categories") {
    const { categories, source } = await getPublicCategories(20);
    return {
      source,
      categories: categories.map((category) => ({
        slug: category.slug,
        name: category.name,
        listingCount: category.listingCount
      }))
    };
  }

  throw new Error("Unknown marketplace tool.");
}
