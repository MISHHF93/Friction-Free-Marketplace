export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { AD_CREATIVES_BUCKET } from "@/lib/ads/placements";
import { requireUser } from "@/lib/payments/auth";
import { isTrustedMutationOrigin } from "@/lib/security/request-origin";
import { consumeRateLimit, RateLimitUnavailableError } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);
const MAX_BYTES = 2 * 1024 * 1024;

/** Self-serve advertisers upload into advertisers/<their id>/ in the ad-creatives bucket. */
export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const limit = await consumeRateLimit(`ads-upload:${auth.user.id}`, { limit: 20, windowMs: 60 * 60_000, policy: "ads-upload" });
    if (!limit.allowed) return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  } catch (error) {
    if (!(error instanceof RateLimitUnavailableError)) throw error;
    return NextResponse.json({ error: "Uploads are temporarily unavailable." }, { status: 503 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File) || file.size <= 0) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Images must be 2 MB or smaller." }, { status: 400 });
  const extension = allowedTypes.get(file.type);
  if (!extension) return NextResponse.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 400 });

  const path = `advertisers/${auth.user.id}/${crypto.randomUUID()}.${extension}`;
  const admin = createAdminClient();
  const { error } = await admin.storage.from(AD_CREATIVES_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: "Unable to upload that image. Please try again." }, { status: 502 });

  return NextResponse.json({
    path,
    publicUrl: admin.storage.from(AD_CREATIVES_BUCKET).getPublicUrl(path).data.publicUrl
  }, { headers: { "Cache-Control": "no-store" } });
}
