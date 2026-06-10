import {
  ListingForm,
  type ListingCategoryOption,
} from "@/components/listings/listing-form";
import { LISTING_CATEGORIES } from "@/lib/listings/validation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getCategoryOptions(): Promise<ListingCategoryOption[]> {
  try {
    const supabase = createClient();
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
  return <ListingForm categories={categories} />;
}
