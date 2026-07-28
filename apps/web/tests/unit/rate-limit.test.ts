import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeRateLimit,
  type RateLimitStore,
  rateLimitHeaders,
  resetRateLimitsForTests,
} from "@/lib/security/rate-limit";

describe("rate limiting", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("allows requests up to the limit and blocks the next request", async () => {
    const options = { policy: "test", limit: 2, windowMs: 60_000 };
    const first = await consumeRateLimit("user:one", options, 1_000);
    const second = await consumeRateLimit("user:one", options, 1_100);
    const blocked = await consumeRateLimit("user:one", options, 1_200);

    expect(first).toMatchObject({ allowed: true, remaining: 1 });
    expect(second).toMatchObject({ allowed: true, remaining: 0 });
    expect(blocked).toMatchObject({ allowed: false, remaining: 0 });
    expect(rateLimitHeaders(blocked)["Retry-After"]).toBeDefined();
  });

  it("isolates users and resets expired windows", async () => {
    const options = { policy: "test", limit: 1, windowMs: 1_000 };
    await consumeRateLimit("user:one", options, 5_000);
    expect((await consumeRateLimit("user:two", options, 5_100)).allowed).toBe(true);
    expect((await consumeRateLimit("user:one", options, 5_500)).allowed).toBe(false);
    expect((await consumeRateLimit("user:one", options, 6_001)).allowed).toBe(true);
  });

  it("never sends a raw user identifier to the shared store", async () => {
    let observedKey = "";
    const store: RateLimitStore = {
      async consume(keyHash, options) {
        observedKey = keyHash;
        return { allowed: true, limit: options.limit, remaining: options.limit - 1, resetAt: 60_000 };
      },
    };

    await consumeRateLimit(
      "ai-agent:private-user-id",
      { policy: "ai-agent", limit: 10, windowMs: 60_000 },
      1_000,
      store,
    );
    expect(observedKey).toMatch(/^[a-f0-9]{64}$/);
    expect(observedKey).not.toContain("private-user-id");
  });
});
