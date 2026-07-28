import { describe, expect, it } from "vitest";
import { isTrustedMutationOrigin } from "@/lib/security/request-origin";

describe("mutation origin validation", () => {
  it("accepts the configured application origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://market.example";
    const request = new Request("https://internal-host/api/ai/agents/run", {
      headers: { origin: "https://market.example" },
    });
    expect(isTrustedMutationOrigin(request)).toBe(true);
  });

  it("accepts the externally forwarded origin", () => {
    const request = new Request("http://container:3000/api/ai/agents/run", {
      headers: {
        origin: "https://market.example",
        "x-forwarded-host": "market.example",
        "x-forwarded-proto": "https",
      },
    });
    expect(isTrustedMutationOrigin(request)).toBe(true);
  });

  it("rejects absent and cross-site origins", () => {
    expect(isTrustedMutationOrigin(new Request("https://market.example/api"))).toBe(false);
    expect(isTrustedMutationOrigin(new Request("https://market.example/api", {
      headers: { origin: "https://attacker.example" },
    }))).toBe(false);
  });
});
