import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAI, isOpenAIConfigured } from "@/lib/openai/client";
import { classifyMarketplaceItem, itemClassificationSchema } from "@/lib/search/item-classifier";
import { searchMarketplace } from "@/lib/search/discovery";
import { createClient } from "@/lib/supabase/server";

const intentSchema = z.object({ query: z.string().trim().min(2).max(300), location: z.string().trim().max(120).optional(), budget: z.number().nonnegative().optional() });
const enrichmentSchema = z.object({
  rewrittenQuery: z.string().trim().min(1).max(300).optional(),
  explanation: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Sign in to use AI search intent extraction." }, { status: 401 });

  const payload = intentSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  const input = payload.data;
  const classification = classifyMarketplaceItem(input.query);
  let explanation = `Classified locally with ${Math.round(classification.categoryConfidence * 100)}% category confidence.`;
  let rewrittenQuery = classification.rewrittenQuery;
  let source: "deterministic" | "hybrid" = "deterministic";

  if (isOpenAIConfigured()) {
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Rewrite the marketplace query for search without inventing filters or product facts. Return JSON with rewrittenQuery and explanation only." },
          { role: "user", content: JSON.stringify({ input, deterministicClassification: classification }) }
        ]
      });
      const content = completion.choices[0]?.message.content;
      const enriched = content ? enrichmentSchema.safeParse(JSON.parse(content)) : null;
      if (enriched?.success) {
        rewrittenQuery = enriched.data.rewrittenQuery ?? rewrittenQuery;
        explanation = enriched.data.explanation ?? explanation;
        source = "hybrid";
      }
    } catch {
      // Deterministic classification remains fully operational.
    }
  }

  const intent = itemClassificationSchema.parse({
    ...classification,
    rewrittenQuery,
    filters: {
      ...classification.filters,
      maxPrice: classification.filters.maxPrice ?? input.budget,
    },
    source,
  });
  const results = await searchMarketplace({ q: intent.rewrittenQuery, ...intent.filters, location: input.location, sort: "recommended", limit: 12 });
  return NextResponse.json({ intent: { ...intent, explanation }, results });
}
