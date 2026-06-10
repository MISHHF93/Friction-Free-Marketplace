import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAI } from "@/lib/openai/client";
import { searchMarketplace } from "@/lib/search/discovery";
import { createClient } from "@/lib/supabase/server";

const intentSchema = z.object({ query: z.string().min(2), location: z.string().optional(), budget: z.number().optional() });

function fallbackIntent(query: string) {
  const lower = query.toLowerCase();
  const maxPriceMatch = lower.match(/(?:under|below|less than|<=?)\s*\$?(\d+)/);
  const category = ["electronics", "home", "outdoors", "collectibles", "vehicles", "services", "fashion"].find((item) => lower.includes(item));
  return {
    rewrittenQuery: query.replace(/\b(under|below|less than)\s*\$?\d+\b/gi, "").trim() || query,
    filters: {
      category,
      maxPrice: maxPriceMatch ? Number(maxPriceMatch[1]) : undefined,
      minSellerTrust: lower.includes("safe") || lower.includes("trusted") ? 90 : undefined,
      condition: lower.includes("new") ? ["New", "Like new"] : undefined
    },
    explanation: "Parsed locally. Add OPENAI_API_KEY for richer buyer-intent extraction."
  };
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Sign in to use AI search intent extraction." }, { status: 401 });

  const payload = intentSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  const input = payload.data;
  let intent = fallbackIntent(input.query);

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Extract marketplace buyer intent as JSON with rewrittenQuery, filters(category,maxPrice,minPrice,minSellerTrust,condition array), and explanation. Keep filters conservative." },
      { role: "user", content: JSON.stringify(input) }
    ]
  });
  const content = completion.choices[0]?.message.content;
  if (content) intent = { ...intent, ...JSON.parse(content) };

  const results = await searchMarketplace({ q: intent.rewrittenQuery, ...(intent.filters ?? {}), sort: "recommended", limit: 12 });
  return NextResponse.json({ intent, results });
}
