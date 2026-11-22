import { NextResponse } from "next/server";
import { recordAdEvent } from "@/lib/ads/events";
import { consumeRateLimit, RateLimitUnavailableError, rateLimitHeaders } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
}

async function record(request: Request, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const headers = { "Cache-Control": "no-store" };
  try {
    const limit = await consumeRateLimit(`ads-impression:${clientKey(request)}:${id}`, {
      limit: 8,
      windowMs: 60_000,
      policy: "ads-impression"
    });
    if (limit.allowed) {
      try {
        await recordAdEvent(id, "impression");
      } catch {
        // Fixture or missing campaign should not surface as a client error.
      }
    }
    return new NextResponse(null, { status: 204, headers: { ...headers, ...rateLimitHeaders(limit) } });
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return new NextResponse(null, { status: 204, headers });
    }
    return new NextResponse(null, { status: 204, headers });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return record(request, id);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return record(request, id);
}
