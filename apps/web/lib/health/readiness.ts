import { validateServerEnv } from "@/lib/env.server";
import { withTimeout } from "@/lib/observability/reliability";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

export type ComponentStatus = "ok" | "degraded" | "error";
export type ReadinessComponent = { required: boolean; status: ComponentStatus };
export type ReadinessResult = {
  status: "ready" | "not_ready";
  service: string;
  release: string;
  components: Record<string, ReadinessComponent>;
};

async function checkSupabase() {
  const client = createAdminClient();
  const query = client.from("categories").select("id", { head: true, count: "exact" }).limit(1);
  const result = await withTimeout(Promise.resolve(query), 2_500);
  if (result.error) throw new Error("SUPABASE_UNAVAILABLE");
}

async function checkMeilisearch(host: string, apiKey: string) {
  const response = await fetch(`${host.replace(/\/$/, "")}/health`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(2_000),
  });
  if (!response.ok) throw new Error("SEARCH_UNAVAILABLE");
}

type ProviderCache = { expiresAt: number; ok: boolean };
const providerCache = new Map<string, ProviderCache>();

async function cachedProviderCheck(name: string, check: () => Promise<void>) {
  const cached = providerCache.get(name);
  if (cached && cached.expiresAt > Date.now()) {
    if (!cached.ok) throw new Error("PROVIDER_UNAVAILABLE");
    return;
  }
  try {
    await check();
    providerCache.set(name, { ok: true, expiresAt: Date.now() + 30_000 });
  } catch {
    providerCache.set(name, { ok: false, expiresAt: Date.now() + 10_000 });
    throw new Error("PROVIDER_UNAVAILABLE");
  }
}

async function checkStripe() {
  await withTimeout(getStripe().balance.retrieve().then(() => undefined), 2_500);
}

export async function evaluateReadiness(): Promise<ReadinessResult> {
  const release = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RELEASE_SHA ?? "development";
  const components: Record<string, ReadinessComponent> = {
    configuration: { required: true, status: "error" },
    database: { required: true, status: "error" },
    payments: { required: true, status: "error" },
    search: { required: false, status: "degraded" },
    ai: { required: false, status: "degraded" },
    email: { required: false, status: "degraded" },
  };

  let env;
  try {
    env = validateServerEnv();
    components.configuration.status = "ok";
    components.ai.status = env.OPENAI_API_KEY ? "ok" : "degraded";
    components.email.status = env.RESEND_API_KEY ? "ok" : "degraded";
  } catch {
    return { status: "not_ready", service: "friction-free-marketplace", release, components };
  }

  try {
    await checkSupabase();
    components.database.status = "ok";
  } catch {
    components.database.status = "error";
  }

  try {
    await cachedProviderCheck("stripe", checkStripe);
    components.payments.status = "ok";
  } catch {
    components.payments.status = "error";
  }

  if (env.MEILISEARCH_HOST && env.MEILISEARCH_API_KEY) {
    try {
      await checkMeilisearch(env.MEILISEARCH_HOST, env.MEILISEARCH_API_KEY);
      components.search.status = "ok";
    } catch {
      components.search.status = "degraded";
    }
  }

  const requiredFailed = Object.values(components).some((component) => component.required && component.status !== "ok");
  return {
    status: requiredFailed ? "not_ready" : "ready",
    service: "friction-free-marketplace",
    release,
    components,
  };
}

export function resetReadinessCacheForTests() {
  providerCache.clear();
}
