import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { searchMarketplace, trackSearchEvent } from "@/lib/search/discovery";
import { parseDiscoverySearchParamsFromRequest, parseDiscoverySearchParamsFromUrl } from "@/lib/search/api";

function validationError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid search request.", issues: error.issues }, { status: 400 });
  }
  throw error;
}

async function getSearchUserId() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function responseForSearch(params: ReturnType<typeof parseDiscoverySearchParamsFromUrl>) {
  const [result, userId] = await Promise.all([searchMarketplace(params), getSearchUserId()]);
  await trackSearchEvent({
    params,
    resultCount: result.total,
    source: result.source,
    userId,
    sessionId: params.sessionId,
  });
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  try {
    return await responseForSearch(parseDiscoverySearchParamsFromUrl(new URL(request.url)));
  } catch (error) {
    return validationError(error);
  }
}

export async function POST(request: Request) {
  try {
    return await responseForSearch(await parseDiscoverySearchParamsFromRequest(request));
  } catch (error) {
    return validationError(error);
  }
}
