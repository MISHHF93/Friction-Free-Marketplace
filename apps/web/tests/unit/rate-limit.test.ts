import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeRateLimit,
  rateLimitHeaders,
  resetRateLimitsForTests,
} from "@/lib/security/rate-limit";

describe("rate limiting", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("allows requests up to the limit and blocks the next request", () => {
    const first = consumeRateLimit("user:one", { limit: 2, windowMs: 60_000 }, 1_000);
    const second = consumeRateLimit("user:one", { limit: 2, windowMs: 60_000 }, 1_100);
    const blocked = consumeRateLimit("user:one", { limit: 2, windowMs: 60_000 }, 1_200);

    expect(first).toMatchObject({ allowed: true, remaining: 1 });
    expect(second).toMatchObject({ allowed: true, remaining: 0 });
    expect(blocked).toMatchObject({ allowed: false, remaining: 0 });
    expect(rateLimitHeaders(blocked)["Retry-After"]).toBeDefined();
  });

  it("isolates users and resets expired windows", () => {
    consumeRateLimit("user:one", { limit: 1, windowMs: 1_000 }, 5_000);
    expect(consumeRateLimit("user:two", { limit: 1, windowMs: 1_000 }, 5_100).allowed).toBe(true);
    expect(consumeRateLimit("user:one", { limit: 1, windowMs: 1_000 }, 5_500).allowed).toBe(false);
    expect(consumeRateLimit("user:one", { limit: 1, windowMs: 1_000 }, 6_001).allowed).toBe(true);
  });
});
