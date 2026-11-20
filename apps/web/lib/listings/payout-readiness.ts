import { ListingPermissionError } from "@/lib/listings/permissions";

export const PAYOUTS_REQUIRED_MESSAGE = "Set up payouts before publishing. Buyers can only pay for listings from sellers with payouts turned on.";
export const PAYOUT_SETUP_PATH = "/dashboard/payments";

export type SellerPayoutAccount = { status?: string | null; charges_enabled?: boolean | null } | null | undefined;

export function sellerPayoutsReady(account: SellerPayoutAccount) {
  return Boolean(account && account.status === "active" && account.charges_enabled);
}

/** Publishing requires an active Stripe Connect account so checkout never dead-ends. */
export async function assertSellerPayoutsReady(supabase: any, sellerId: string) {
  const { data, error } = await supabase
    .from("seller_payment_accounts")
    .select("status,charges_enabled")
    .eq("seller_id", sellerId)
    .maybeSingle();
  if (error) throw new ListingPermissionError("Could not check your payout setup. Try again.", 409);
  if (!sellerPayoutsReady(data)) throw new ListingPermissionError(PAYOUTS_REQUIRED_MESSAGE, 409);
}
