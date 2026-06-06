import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { getStripe } from "@/lib/stripe/server";

function mapAccountStatus(account: { charges_enabled?: boolean; payouts_enabled?: boolean; details_submitted?: boolean; requirements?: { disabled_reason?: string | null } | null }) {
  if (account.charges_enabled && account.payouts_enabled) return "active";
  if (account.requirements?.disabled_reason) return "restricted";
  if (account.details_submitted) return "pending";
  return "onboarding";
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const supabase = createAdminClient() as any;
  const { data } = await supabase.from("seller_payment_accounts").select("*").eq("seller_id", auth.user.id).maybeSingle();
  if (!data) return NextResponse.json({ status: "not_started" });

  const account = await getStripe().accounts.retrieve(data.stripe_account_id);
  const status = mapAccountStatus(account);
  await supabase.from("seller_payment_accounts").update({
    status,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
    disabled_reason: account.requirements?.disabled_reason ?? null,
    requirements_currently_due: account.requirements?.currently_due ?? [],
    requirements_eventually_due: account.requirements?.eventually_due ?? [],
    onboarding_completed_at: status === "active" ? new Date().toISOString() : data.onboarding_completed_at
  }).eq("seller_id", auth.user.id);

  return NextResponse.json({ ...data, status, charges_enabled: account.charges_enabled, payouts_enabled: account.payouts_enabled, details_submitted: account.details_submitted });
}
