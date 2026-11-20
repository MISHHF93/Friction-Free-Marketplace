import { afterEach, describe, expect, it } from "vitest";
import { e2eUserFromCookie, isE2EAuthEnabled, isolatedPreviewCounts } from "@/lib/auth/e2e-session";

describe("per-user session fixtures", () => {
  afterEach(() => {
    delete process.env.FFM_E2E_AUTH;
    delete process.env.VERCEL;
    delete process.env.FFM_BIND_HOST;
  });

  it("keeps two local test users distinct and closed in production", () => {
    process.env.FFM_E2E_AUTH = "true";
    process.env.NODE_ENV = "development";
    process.env.FFM_BIND_HOST = "127.0.0.1";
    const alice = e2eUserFromCookie("alice", "127.0.0.1:3001");
    const bob = e2eUserFromCookie("bob", "localhost:3001");

    expect(alice?.displayName).toBe("Alice Buyer");
    expect(bob?.displayName).toBe("Bob Seller");
    expect(alice?.id).not.toBe(bob?.id);
    expect(isolatedPreviewCounts(alice!.id)).not.toEqual(isolatedPreviewCounts(bob!.id));

    process.env.NODE_ENV = "production";
    expect(isE2EAuthEnabled("127.0.0.1:3001")).toBe(false);
    expect(e2eUserFromCookie("alice", "127.0.0.1:3001")).toBeNull();
  });

  it("does not accept an unknown cookie as a shared user", () => {
    process.env.FFM_E2E_AUTH = "true";
    process.env.NODE_ENV = "development";
    process.env.FFM_BIND_HOST = "127.0.0.1";
    expect(e2eUserFromCookie("garfield", "localhost:3001")).toBeNull();
    expect(e2eUserFromCookie(undefined, "localhost:3001")).toBeNull();
  });
});
