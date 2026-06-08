export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { formatConnectError, getStoredSellerAccount } from "@/lib/payments/connect";
import { getStripe } from "@/lib/stripe/server";

export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const supabase = createAdminClient() as any;
    const stored = await getStoredSellerAccount(supabase, auth.user.id);
    if (!stored?.stripe_account_id) {
      return NextResponse.json({ error: "Create your Stripe seller account before opening the Express Dashboard." }, { status: 409 });
    }

    const loginLink = await getStripe().accounts.createLoginLink(stored.stripe_account_id);
    return NextResponse.json({ url: loginLink.url });
  } catch (error) {
    return NextResponse.json({ error: formatConnectError(error) }, { status: 502 });
  }
}
