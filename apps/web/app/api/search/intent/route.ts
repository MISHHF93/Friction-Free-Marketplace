import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAI } from "@/lib/openai/client";
import { searchMarketplace } from "@/lib/search/discovery";

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
  const input = intentSchema.parse(await request.json());
  let intent = fallbackIntent(input.query);

  if (process.env.OPENAI_API_KEY) {
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
  }

  const results = await searchMarketplace({ q: intent.rewrittenQuery, ...(intent.filters ?? {}), sort: "recommended", limit: 12 });
  return NextResponse.json({ intent, results });
}
