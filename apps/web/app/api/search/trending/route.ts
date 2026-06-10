import { NextResponse } from "next/server";
import { searchMarketplace } from "@/lib/search/discovery";
import { parseDiscoverySearchParamsFromUrl } from "@/lib/search/api";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = parseDiscoverySearchParamsFromUrl(url);
  const result = await searchMarketplace({
    ...params,
    sort: "trending",
    limit: Number(url.searchParams.get("limit") ?? 8),
  });
  return NextResponse.json({
    ...result,
    ranking: {
      primary: "trend_score",
      signals: ["recent views", "saved count", "freshness", "seller safety"],
    },
  });
}
