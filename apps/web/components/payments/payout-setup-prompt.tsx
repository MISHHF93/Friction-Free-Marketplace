import Link from "next/link";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAYOUT_SETUP_PATH, sellerPayoutsReady } from "@/lib/listings/payout-readiness";
import { isLiveDatabaseConfigured } from "@/lib/marketplace/demo-mode";
import { createClient } from "@/lib/supabase/server";

/** Shown to sellers who cannot publish yet because payouts are not set up. Hidden when the check cannot run. */
export async function PayoutSetupPrompt() {
  return (await sellerNeedsPayoutSetup()) ? <PayoutSetupNotice /> : null;
}

async function sellerNeedsPayoutSetup() {
  if (!isLiveDatabaseConfigured()) return false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await (supabase as any)
      .from("seller_payment_accounts")
      .select("status,charges_enabled")
      .eq("seller_id", user.id)
      .maybeSingle();
    return !error && !sellerPayoutsReady(data);
  } catch {
    return false;
  }
}

export function PayoutSetupNotice() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between" role="status" data-testid="payout-setup-prompt">
      <div className="flex items-start gap-3">
        <Wallet className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Set up payouts to publish</p>
          <p className="text-sm">You can save drafts now. Listings go live once payouts are on, so buyers can pay you through protected checkout.</p>
        </div>
      </div>
      <Button asChild size="sm"><Link href={PAYOUT_SETUP_PATH}>Set up payouts</Link></Button>
    </div>
  );
}
