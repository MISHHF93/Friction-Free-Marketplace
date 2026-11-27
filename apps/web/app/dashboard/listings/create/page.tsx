import {
  ListingForm,
  type ListingCategoryOption,
} from "@/components/listings/listing-form";
import { isLiveDatabaseConfigured } from "@/lib/marketplace/demo-mode";
import { LISTING_CATEGORIES } from "@/lib/listings/validation";
import { createClient } from "@/lib/supabase/server";
import { PayoutSetupPrompt } from "@/components/payments/payout-setup-prompt";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sell an item" };

async function getCategoryOptions(): Promise<ListingCategoryOption[]> {
  if (!isLiveDatabaseConfigured()) {
    return LISTING_CATEGORIES.map((slug) => ({
      slug,
      name: slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
    }));
  }
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("categories")
      .select("slug,name")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    return (data ?? [])
      .filter(
        (
          category,
        ): category is { slug: ListingCategoryOption["slug"]; name: string } =>
          LISTING_CATEGORIES.includes(
            category.slug as ListingCategoryOption["slug"],
          ),
      )
      .map((category) => ({ slug: category.slug, name: category.name }));
  } catch {
    return LISTING_CATEGORIES.map((slug) => ({
      slug,
      name: slug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    }));
  }
}

export default async function CreateListingPage() {
  const categories = await getCategoryOptions();
  return (
    <>
      <div className="mx-auto w-full max-w-5xl pt-4 empty:hidden"><PayoutSetupPrompt /></div>
      <ListingForm categories={categories} />
    </>
  );
}
