import { afterEach, describe, expect, it } from "vitest";
import { devBypassCookieSecure, getLocalAuthUser, isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass";

describe("development auth bypass", () => {
  afterEach(() => {
    delete process.env.ALLOW_DEV_AUTH_BYPASS;
    delete process.env.VERCEL;
    delete process.env.CI;
    delete process.env.FFM_BIND_HOST;
  });

  it("stays off unless every local gate is present", () => {
    process.env.NODE_ENV = "development";
    expect(isDevAuthBypassEnabled("localhost:3001")).toBe(false);

    process.env.ALLOW_DEV_AUTH_BYPASS = "true";
    expect(isDevAuthBypassEnabled("localhost:3001")).toBe(false);
    process.env.FFM_BIND_HOST = "127.0.0.1";
    expect(isDevAuthBypassEnabled("localhost:3001")).toBe(true);
    expect(isDevAuthBypassEnabled("marketplace.example")).toBe(false);
    expect(isDevAuthBypassEnabled(null)).toBe(false);
    expect(getLocalAuthUser(undefined, "localhost:3001")).toBeNull();
    expect(getLocalAuthUser("1", "localhost:3001")?.id).toBe("dev-bypass-user");
  });

  it("fails closed in production and on Vercel even when the flag is set", () => {
    process.env.ALLOW_DEV_AUTH_BYPASS = "true";
    process.env.NODE_ENV = "production";
    expect(isDevAuthBypassEnabled("localhost")).toBe(false);
    expect(getLocalAuthUser("1", "localhost")).toBeNull();

    process.env.NODE_ENV = "development";
    process.env.VERCEL = "1";
    expect(isDevAuthBypassEnabled("127.0.0.1:3001")).toBe(false);
  });

  it("marks the bypass cookie secure unless the app URL is http", () => {
    expect(devBypassCookieSecure("http://localhost:3001")).toBe(false);
    expect(devBypassCookieSecure("https://market.example")).toBe(true);
    expect(devBypassCookieSecure(undefined)).toBe(true);
    expect(devBypassCookieSecure("not a url")).toBe(true);
  });
});
