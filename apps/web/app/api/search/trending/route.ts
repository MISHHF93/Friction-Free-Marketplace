import { NextResponse } from "next/server";
import { searchMarketplace } from "@/lib/search/discovery";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await searchMarketplace({ category: url.searchParams.get("category") ?? undefined, sort: "trending", limit: Number(url.searchParams.get("limit") ?? 8) });
  return NextResponse.json(result);
}
