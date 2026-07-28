import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

type RateLimitBucket = { count: number; resetAt: number };
export type RateLimitOptions = { limit: number; windowMs: number; policy: string };
export type RateLimitResult = { allowed: boolean; limit: number; remaining: number; resetAt: number };
export type RateLimitStore = {
  consume(keyHash: string, options: RateLimitOptions, now?: number): Promise<RateLimitResult>;
};

const buckets = new Map<string, RateLimitBucket>();
let lastSweepAt = 0;

export class RateLimitUnavailableError extends Error {
  constructor() {
    super("Distributed rate limiting is unavailable.");
    this.name = "RateLimitUnavailableError";
  }
}

export const memoryRateLimitStore: RateLimitStore = {
  async consume(keyHash, options, now = Date.now()) {
    if (now - lastSweepAt > options.windowMs) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
      lastSweepAt = now;
    }

    const storageKey = `${options.policy}:${keyHash}`;
    const current = buckets.get(storageKey);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : current;

    bucket.count += 1;
    buckets.set(storageKey, bucket);
    return {
      allowed: bucket.count <= options.limit,
      limit: options.limit,
      remaining: Math.max(0, options.limit - bucket.count),
      resetAt: bucket.resetAt,
    };
  },
};

export const supabaseRateLimitStore: RateLimitStore = {
  async consume(keyHash, options) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await (supabase as any).rpc("consume_rate_limit", {
        p_key_hash: keyHash,
        p_policy_name: options.policy,
        p_window_seconds: Math.max(1, Math.ceil(options.windowMs / 1000)),
        p_request_limit: options.limit,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || typeof row.allowed !== "boolean") throw new Error("Invalid rate-limit response.");
      return {
        allowed: row.allowed,
        limit: options.limit,
        remaining: Number(row.remaining),
        resetAt: new Date(row.reset_at).getTime(),
      };
    } catch {
      throw new RateLimitUnavailableError();
    }
  },
};

function shouldUseMemoryStore() {
  return process.env.NODE_ENV === "test"
    || (process.env.NODE_ENV !== "production" && process.env.CI !== "true");
}

export async function consumeRateLimit(
  key: string,
  options: RateLimitOptions,
  now?: number,
  store: RateLimitStore = shouldUseMemoryStore() ? memoryRateLimitStore : supabaseRateLimitStore,
) {
  const keyHash = createHash("sha256").update(key).digest("hex");
  return store.consume(keyHash, options, now);
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.allowed ? {} : {
      "Retry-After": String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))),
    }),
  };
}

export function resetRateLimitsForTests() {
  buckets.clear();
  lastSweepAt = 0;
}
