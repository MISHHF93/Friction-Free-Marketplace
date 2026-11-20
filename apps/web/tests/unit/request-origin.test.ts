import { afterEach, describe, expect, it } from "vitest";
import { isTrustedMutationOrigin } from "@/lib/security/request-origin";

describe("mutation origin validation", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL;
  });

  it("accepts the configured application origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://market.example";
    process.env.NODE_ENV = "production";
    process.env.VERCEL = "1";
    const request = new Request("https://internal-host/api/ai/agents/run", {
      headers: {
        origin: "https://market.example",
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "https"
      },
    });
    expect(isTrustedMutationOrigin(request)).toBe(true);
  });

  it("rejects an origin that only matches the forwarded host", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://market.example";
    process.env.NODE_ENV = "production";
    process.env.VERCEL = "1";
    const request = new Request("http://container:3000/api/ai/agents/run", {
      headers: {
        origin: "https://attacker.example",
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "https",
        host: "attacker.example"
      },
    });
    expect(isTrustedMutationOrigin(request)).toBe(false);
  });

  it("rejects absent and cross-site origins", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://market.example";
    expect(isTrustedMutationOrigin(new Request("https://market.example/api"))).toBe(false);
    expect(isTrustedMutationOrigin(new Request("https://market.example/api", {
      headers: { origin: "https://attacker.example" },
    }))).toBe(false);
  });
});
