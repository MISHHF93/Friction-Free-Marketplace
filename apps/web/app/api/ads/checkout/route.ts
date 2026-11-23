export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { AD_PLACEMENT_KEYS } from "@/lib/ads/placements";
import { loadAdPricingForCheckout } from "@/lib/ads/pricing";
import { AdCheckoutError, resumeAdCheckout, startNewAdCheckout } from "@/lib/ads/checkout";
import { validateAdvertiserTarget } from "@/lib/ads/self-serve";
import { publicEnv } from "@/lib/env";
import { requireUser } from "@/lib/payments/auth";
import { parseIdempotencyKey } from "@/lib/payments/idempotency";
import { isTrustedMutationOrigin } from "@/lib/security/request-origin";
import { consumeRateLimit, RateLimitUnavailableError } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

const newAdSchema = z.object({
  placement: z.enum(AD_PLACEMENT_KEYS),
  title: z.string().trim().min(1).max(120),
  altText: z.string().trim().max(200).optional(),
  advertiserName: z.string().trim().min(1).max(120),
  targetUrl: z.string().trim().min(1).max(2000),
  imagePath: z.string().trim().min(1).max(500),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  runDays: z.number().int().min(1).max(90)
});

const resumeSchema = z.object({ campaignId: z.string().uuid() });

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const requestKey = parseIdempotencyKey(request.headers.get("idempotency-key"));
  if (!requestKey) return NextResponse.json({ error: "A valid Idempotency-Key header is required." }, { status: 400 });

  try {
    const limit = await consumeRateLimit(`ads-checkout:${auth.user.id}`, { limit: 10, windowMs: 10 * 60_000, policy: "ads-checkout" });
    if (!limit.allowed) return NextResponse.json({ error: "Too many checkout attempts. Try again in a few minutes." }, { status: 429 });
  } catch (error) {
    if (!(error instanceof RateLimitUnavailableError)) throw error;
    return NextResponse.json({ error: "Checkout is temporarily unavailable." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const deps = {
    supabase: createAdminClient() as any,
    stripe: getStripe(),
    appUrl: publicEnv.NEXT_PUBLIC_APP_URL,
    loadPricing: loadAdPricingForCheckout
  };
  const user = { id: auth.user.id, email: auth.user.email ?? null };

  try {
    const resume = resumeSchema.safeParse(body);
    if (resume.success) {
      return NextResponse.json(await resumeAdCheckout(deps, user, resume.data.campaignId, requestKey), { headers: { "Cache-Control": "no-store" } });
    }
    const parsed = newAdSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Check the ad details and try again." }, { status: 400 });
    const targetUrl = validateAdvertiserTarget(parsed.data.targetUrl);
    if (!targetUrl) return NextResponse.json({ error: "The link must be a full https:// address." }, { status: 400 });
    const result = await startNewAdCheckout(deps, user, { ...parsed.data, targetUrl }, requestKey);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AdCheckoutError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Ad checkout failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
