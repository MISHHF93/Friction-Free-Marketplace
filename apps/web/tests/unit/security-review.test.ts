import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { offerResponseAllowed } from "@/lib/offers/response-authorization";
import { openCheckoutStatuses } from "@/lib/payments/open-checkout";
import { contentSecurityPolicy, scriptSource } from "@/lib/security/csp";
import { documentLocale } from "@/lib/i18n/document-locale";
import { isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass";
import { isE2EAuthEnabled } from "@/lib/auth/e2e-session";

const buyer = "11111111-1111-4111-8111-111111111111";
const seller = "22222222-2222-4222-8222-222222222222";

describe("offer response roles", () => {
  it("lets only the creator withdraw and only the other participant accept or decline", () => {
    expect(offerResponseAllowed({ actorId: buyer, createdById: buyer, buyerId: buyer, sellerId: seller, response: "withdrawn" })).toBe(true);
    expect(offerResponseAllowed({ actorId: seller, createdById: buyer, buyerId: buyer, sellerId: seller, response: "withdrawn" })).toBe(false);
    expect(offerResponseAllowed({ actorId: seller, createdById: buyer, buyerId: buyer, sellerId: seller, response: "accepted" })).toBe(true);
    expect(offerResponseAllowed({ actorId: buyer, createdById: buyer, buyerId: buyer, sellerId: seller, response: "declined" })).toBe(false);
    expect(offerResponseAllowed({ actorId: buyer, createdById: null, buyerId: buyer, sellerId: seller, response: "accepted" })).toBe(false);
  });
});

describe("open checkout statuses", () => {
  it("includes dispute and fulfillment states", () => {
    expect(openCheckoutStatuses).toEqual(expect.arrayContaining(["disputed", "resolving", "shipped", "delivered", "escrowed"]));
  });
});

describe("production script policy", () => {
  it("does not allow unsafe-inline scripts outside development", () => {
    const production = scriptSource({ development: false, nonce: "abc123" });
    expect(production).toContain("'nonce-abc123'");
    expect(production).not.toContain("unsafe-inline");
    expect(contentSecurityPolicy({ development: false, nonce: "abc123" }).split(";").find((part) => part.trim().startsWith("script-src"))).not.toContain("unsafe-inline");
    expect(scriptSource({ development: true })).toContain("unsafe-inline");
  });
});

describe("document locale", () => {
  it("defaults to English left-to-right and follows a profile locale", () => {
    expect(documentLocale(null, null)).toEqual({ lang: "en", dir: "ltr" });
    expect(documentLocale("ar-EG", "en")).toEqual({ lang: "en", dir: "ltr" });
    expect(documentLocale(null, "fr-CA,en;q=0.8")).toEqual({ lang: "en", dir: "ltr" });
  });
});

describe("local auth runtime", () => {
  beforeEach(() => {
    delete process.env.ALLOW_DEV_AUTH_BYPASS;
    delete process.env.FFM_E2E_AUTH;
    delete process.env.FFM_BIND_HOST;
    delete process.env.VERCEL;
    delete process.env.CI;
  });
  afterEach(() => {
    delete process.env.ALLOW_DEV_AUTH_BYPASS;
    delete process.env.FFM_E2E_AUTH;
    delete process.env.FFM_BIND_HOST;
    delete process.env.VERCEL;
    delete process.env.CI;
  });
  it("treats an unknown NODE_ENV as off and rejects a public remote address", () => {
    process.env.ALLOW_DEV_AUTH_BYPASS = "true";
    process.env.FFM_E2E_AUTH = "true";
    process.env.NODE_ENV = "staging";
    expect(isDevAuthBypassEnabled("127.0.0.1:3001")).toBe(false);
    expect(isE2EAuthEnabled("127.0.0.1:3001")).toBe(false);

    process.env.NODE_ENV = "development";
    expect(isDevAuthBypassEnabled("127.0.0.1:3001")).toBe(false);
    expect(isE2EAuthEnabled("127.0.0.1:3001")).toBe(false);
    process.env.FFM_BIND_HOST = "127.0.0.1";
    expect(isDevAuthBypassEnabled("127.0.0.1:3001")).toBe(true);
    expect(isE2EAuthEnabled("127.0.0.1:3001")).toBe(true);
    delete process.env.FFM_BIND_HOST;
    delete process.env.FFM_E2E_AUTH;
  });
});
