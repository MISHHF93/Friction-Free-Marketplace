import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Edit, Plus, ShieldAlert, Trash2 } from "lucide-react";
import {
  changeListingStatusAction,
  deleteListingAction,
} from "@/actions/listings";
import {
  DashboardEmptyState,
  DashboardShell,
} from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ListingRow = {
  id: string;
  title: string;
  status: string;
  price_amount: number;
  currency: string;
  condition: string | null;
  updated_at: string;
  metadata: Record<string, unknown> | null;
  listing_images?: Array<{ public_url: string | null }>;
};

async function getListings() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { listings: [], authRequired: true, error: null };
    const { data, error } = await supabase
      .from("listings")
      .select(
        "id,title,status,price_amount,currency,condition,updated_at,metadata,listing_images(public_url)",
      )
      .eq("seller_id", user.id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return {
      listings: (data ?? []) as ListingRow[],
      authRequired: false,
      error: null,
    };
  } catch (error) {
    return {
      listings: [] as ListingRow[],
      authRequired: false,
      error:
        error instanceof Error ? error.message : "Unable to load listings.",
    };
  }
}

async function publishListingFromDashboard(listingId: string) {
  "use server";
  await changeListingStatusAction(listingId, "active");
}

async function markListingSoldFromDashboard(listingId: string) {
  "use server";
  await changeListingStatusAction(listingId, "sold");
}

async function deleteListingFromDashboard(listingId: string) {
  "use server";
  await deleteListingAction(listingId);
}

export default async function ListingsDashboardPage() {
  const { listings, authRequired, error } = await getListings();

  return (
    <DashboardShell
      title="My listings"
      description="Manage drafts, active listings, AI-generated recommendations, and moderation status from one place."
    >
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/dashboard/listings/create">
            <Plus className="h-4 w-4" /> Create listing
          </Link>
        </Button>
      </div>

      {authRequired && (
        <Card>
          <CardContent className="p-6">
            Sign in to create drafts, publish listings, and manage your seller
            inventory.
          </CardContent>
        </Card>
      )}
      {error && (
        <Card>
          <CardContent className="p-6 text-destructive">{error}</CardContent>
        </Card>
      )}
      {!authRequired && !error && listings.length === 0 && (
        <DashboardEmptyState
          title="No listings yet"
          description="Start with photos or create one manually to publish your first marketplace listing."
          action={
            <Button asChild>
              <Link href="/dashboard/listings/create">
                <Plus className="h-4 w-4" /> Create listing
              </Link>
            </Button>
          }
        />
      )}

      <div className="grid gap-4">
        {listings.map((listing) => {
          const moderationStatus =
            typeof listing.metadata?.moderation_status === "string"
              ? listing.metadata.moderation_status
              : "pending";
          const fraudScore =
            typeof (
              listing.metadata?.ai_listing as
                | Record<string, unknown>
                | undefined
            )?.fraudRiskScore === "number"
              ? (listing.metadata?.ai_listing as { fraudRiskScore: number })
                  .fraudRiskScore
              : null;
          return (
            <Card key={listing.id}>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {listing.listing_images?.[0]?.public_url ? (
                    <Image
                      src={listing.listing_images[0].public_url}
                      alt=""
                      width={80}
                      height={80}
                      unoptimized
                      className="h-20 w-20 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-xl bg-secondary" />
                  )}
                  <div>
                    <CardTitle className="text-xl">{listing.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {listing.currency} $
                      {Number(listing.price_amount).toLocaleString()} ·{" "}
                      {listing.condition ?? "condition not set"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>{listing.status}</Badge>
                      <Badge>moderation: {moderationStatus}</Badge>
                      {fraudScore !== null && (
                        <Badge>
                          <ShieldAlert className="h-3 w-3" /> fraud {fraudScore}
                          /100
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/dashboard/listings/${listing.id}/edit`}>
                      <Edit className="h-4 w-4" /> Edit
                    </Link>
                  </Button>
                  {listing.status !== "active" && (
                    <form
                      action={publishListingFromDashboard.bind(
                        null,
                        listing.id,
                      )}
                    >
                      <Button type="submit" variant="secondary">
                        <CheckCircle2 className="h-4 w-4" /> Publish
                      </Button>
                    </form>
                  )}
                  {listing.status !== "sold" && (
                    <form
                      action={markListingSoldFromDashboard.bind(
                        null,
                        listing.id,
                      )}
                    >
                      <Button type="submit" variant="outline">
                        Mark sold
                      </Button>
                    </form>
                  )}
                  <form
                    action={deleteListingFromDashboard.bind(null, listing.id)}
                  >
                    <Button type="submit" variant="ghost">
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </form>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </DashboardShell>
  );
}
