import { notFound } from "next/navigation";
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

export default async function EditListingPage({
  params,
}: {
  params: { id: string };
}) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) notFound();

    const { data, error } = await supabase
      .from("listings")
      .select("*, listing_images(*)")
      .eq("id", params.id)
      .eq("seller_id", user.id)
      .is("deleted_at", null)
      .single();

    if (error || !data) notFound();
    const categories = await getCategoryOptions();
    return <ListingForm listing={data as any} categories={categories} />;
  } catch {
    notFound();
  }
}
