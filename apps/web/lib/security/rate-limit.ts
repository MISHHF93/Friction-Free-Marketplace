type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();
let lastSweepAt = 0;

export function consumeRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
  now = Date.now(),
): RateLimitResult {
  if (now - lastSweepAt > options.windowMs) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
    lastSweepAt = now;
  }

  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + options.windowMs }
    : current;

  bucket.count += 1;
  buckets.set(key, bucket);

  return {
    allowed: bucket.count <= options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.allowed
      ? {}
      : { "Retry-After": String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))) }),
  };
}

export function resetRateLimitsForTests() {
  buckets.clear();
  lastSweepAt = 0;
}
