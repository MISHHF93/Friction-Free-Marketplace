import {
  ListingForm,
  type ListingCategoryOption,
} from "@/components/listings/listing-form";
import { LISTING_CATEGORIES } from "@/lib/listings/validation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getCategoryOptions(): Promise<ListingCategoryOption[]> {
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
}

export default async function AiListingCreatorPage() {
  const categories = await getCategoryOptions();

  return (
    <div className="bg-background">
      <section className="mx-auto max-w-7xl px-4 pt-10">
        <div className="rounded-3xl border border-primary/20 bg-card p-6 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
            AI listing generation
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground md:text-4xl">
            Upload photos, add optional notes, and generate a trusted seller draft.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
            The AI reviews your images and notes to suggest a title, description,
            category, condition, fair price range, SEO tags, scam-risk warning,
            and missing-information questions. Review everything before saving or
            publishing.
          </p>
        </div>
      </section>
      <ListingForm categories={categories} />
    </div>
  );
}
