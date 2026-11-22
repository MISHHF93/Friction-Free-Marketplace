export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { env } from "@/lib/env.server";
import { authorizeJobRequest } from "@/lib/security/secrets";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueTemplateNotification } from "@/lib/notifications/service";

type ExpiredOffer = {
  id: string;
  buyer_id: string | null;
  seller_id: string | null;
  amount: number | null;
  currency: string | null;
  conversation_id: string | null;
  listing_id: string | null;
  metadata?: { transition_reason?: string } | null;
};

async function notifyExpiredOffers(supabase: any, offers: ExpiredOffer[]) {
  await Promise.all(offers.flatMap((offer) => {
    const recipients = [...new Set([offer.buyer_id, offer.seller_id].filter((id): id is string => typeof id === "string"))];
    return recipients.map((userId) => enqueueTemplateNotification({
      userId,
      template: "offer_expired",
      input: {
        amount: offer.amount,
        currency: typeof offer.currency === "string" ? offer.currency.toUpperCase() : null,
        actionUrl: `/dashboard/messages?conversation=${offer.conversation_id ?? ""}`
      },
      payload: {
        offer_id: offer.id,
        listing_id: offer.listing_id,
        conversation_id: offer.conversation_id,
        reason: offer.metadata && typeof offer.metadata === "object" ? offer.metadata.transition_reason ?? null : null
      },
      supabase
    }));
  }));
}

async function expireOffers(request: Request) {
  const authorization = authorizeJobRequest(request, env.SCHEDULED_JOB_SECRET, "Unauthorized offer expiration request.");
  if (!authorization.ok) return NextResponse.json({ error: authorization.error }, { status: authorization.status });

  const supabase = createAdminClient() as any;
  const { data, error } = await supabase.rpc("expire_due_offers_returning");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const expiredOffers = (data ?? []) as ExpiredOffer[];
  // Hourly housekeeping that rides on this cron so the Vercel cron count stays the same.
  const unavailable = await supabase.rpc("expire_offers_on_unavailable_listings_returning");
  const unavailableOffers = unavailable.error ? [] : (unavailable.data ?? []) as ExpiredOffer[];
  const lifted = await supabase.rpc("lift_expired_suspensions");
  await notifyExpiredOffers(supabase, [...expiredOffers, ...unavailableOffers]);
  return NextResponse.json({
    ok: true,
    expired: expiredOffers.length,
    expiredForUnavailableListings: unavailable.error ? null : unavailableOffers.length,
    liftedSuspensions: lifted.error ? null : Number(lifted.data ?? 0)
  });
}

export function POST(request: Request) {
  return expireOffers(request);
}

export function GET(request: Request) {
  return expireOffers(request);
}
