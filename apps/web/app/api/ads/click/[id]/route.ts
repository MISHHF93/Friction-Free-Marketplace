import { NextResponse } from "next/server";
import { E2E_AD_CAMPAIGN_ID, e2eFixtureCampaign } from "@/lib/ads/e2e-campaign";
import { recordAdEvent } from "@/lib/ads/events";
import { resolveAdTarget } from "@/lib/ads/redirect";
import { publicEnv } from "@/lib/env";
import { consumeRateLimit, RateLimitUnavailableError, rateLimitHeaders } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const fixtureId = E2E_AD_CAMPAIGN_ID;

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
}

async function loadTarget(id: string) {
  if (process.env.FFM_E2E_AUTH === "true" && id === fixtureId) {
    return { id, target_url: e2eFixtureCampaign("home_top_banner").target_url };
  }
  try {
    const supabase = createAdminClient() as any;
    const { data: campaign } = await supabase.from("ad_campaigns").select("id,target_url,status").eq("id", id).maybeSingle();
    if (!campaign?.id || typeof campaign.target_url !== "string") return null;
    // Unreviewed, unpaid or rejected self-serve ads never redirect.
    if (!["approved", "active", "expired"].includes(String(campaign.status ?? "approved"))) return null;
    return { id: campaign.id as string, target_url: campaign.target_url };
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const campaign = await loadTarget(id);
  const target = resolveAdTarget(campaign?.target_url ?? "", publicEnv.NEXT_PUBLIC_APP_URL);
  if (!campaign || !target) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const limit = await consumeRateLimit(`ads-click:${clientKey(request)}`, { limit: 30, windowMs: 60_000, policy: "ads-click" });
    if (limit.allowed && id !== fixtureId) {
      await recordAdEvent(campaign.id, "click");
    }
    return NextResponse.redirect(target, { status: 302, headers: rateLimitHeaders(limit) });
  } catch (error) {
    if (!(error instanceof RateLimitUnavailableError)) {
      // Counting is best-effort; an allowed target still redirects.
    }
    return NextResponse.redirect(target, { status: 302 });
  }
}
