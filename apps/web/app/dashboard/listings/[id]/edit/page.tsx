import { notFound } from "next/navigation";
import { ListingForm } from "@/components/listings/listing-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) notFound();

    const { data, error } = await supabase
      .from("listings")
      .select("*, listing_images(*)")
      .eq("id", params.id)
      .eq("seller_id", user.id)
      .is("deleted_at", null)
      .single();

    if (error || !data) notFound();
    return <ListingForm listing={data as any} />;
  } catch {
    notFound();
  }
}
