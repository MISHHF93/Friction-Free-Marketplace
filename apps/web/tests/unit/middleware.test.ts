import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DEV_AUTH_BYPASS_COOKIE } from "@/lib/auth/dev-bypass";
import { config, getSafeRedirectPath, isAuthRoute, isProtectedRoute, proxy } from "../../proxy";

const supabaseUrl = "https://example-project.supabase.co";
const anonKey = "test-anon-key";

function createRequest(pathname: string, cookie?: string, init?: { method?: string; origin?: string; host?: string }) {
  return new NextRequest(new URL(pathname, "https://marketplace.example"), {
    method: init?.method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(init?.origin ? { origin: init.origin } : {}),
      ...(init?.host ? { host: init.host } : { host: "marketplace.example" }),
    }
  });
}

function enableLocalBypass() {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("CI", "");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("ALLOW_DEV_AUTH_BYPASS", "true");
}

function createSupabaseAuthCookie(accessToken: string) {
  const encodedSession = btoa(JSON.stringify({ access_token: accessToken }));
  return `sb-example-project-auth-token=base64-${encodedSession}`;
}

describe("middleware route helpers", () => {
  it("identifies protected and auth routes", () => {
    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/dashboard/listings")).toBe(true);
    expect(isProtectedRoute("/browse")).toBe(false);
    expect(isAuthRoute("/login")).toBe(true);
    expect(isAuthRoute("/signup")).toBe(true);
    expect(isAuthRoute("/login/reset")).toBe(false);
  });

  it("only accepts relative redirect targets", () => {
    expect(getSafeRedirectPath("/seller/orders")).toBe("/seller/orders");
    expect(getSafeRedirectPath("//evil.example/phish")).toBe("/dashboard");
    expect(getSafeRedirectPath("https://evil.example/phish")).toBe("/dashboard");
    expect(getSafeRedirectPath(null, "/fallback")).toBe("/fallback");
  });

  it("invokes middleware for API security policy", () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`);

    expect(matcher.test("/dashboard")).toBe(true);
    expect(matcher.test("/api/admin/users")).toBe(true);
  });
});

describe("middleware", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does not call Supabase for public routes", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxy(createRequest("/browse?q=camera"));

    expect(response.headers.get("location")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects cross-site browser mutations before route execution", async () => {
    const response = await proxy(createRequest("/api/offers", undefined, {
      method: "POST",
      origin: "https://attacker.example",
    }));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Invalid request origin." });
  });

  it("allows same-origin browser mutations and signed server routes", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://marketplace.example");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    const browserResponse = await proxy(createRequest("/api/offers", undefined, {
      method: "POST",
      origin: "https://marketplace.example",
    }));
    const webhookResponse = await proxy(createRequest("/api/stripe/webhooks", undefined, { method: "POST" }));
    expect(browserResponse.status).toBe(200);
    expect(webhookResponse.status).toBe(200);
  });

  it("redirects protected routes instead of crashing when the Supabase cookie is a null session", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const encodedNullSession = btoa("null");

    const response = await proxy(createRequest("/dashboard", `sb-example-project-auth-token=base64-${encodedNullSession}`));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://marketplace.example/login?next=%2Fdashboard");
  });

  it("redirects protected routes to login when auth lookup fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);
    const fetchMock = vi.fn().mockRejectedValue(new Error("network unavailable"));
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxy(createRequest("/dashboard?tab=listings", createSupabaseAuthCookie("access-token")));

    expect(fetchMock).toHaveBeenCalledWith(`${supabaseUrl}/auth/v1/user`, expect.any(Object));
    expect(consoleErrorMock).toHaveBeenCalledWith("Proxy Supabase auth lookup failed", expect.any(Error));
    expect(response.headers.get("location")).toBe("https://marketplace.example/login?next=%2Fdashboard%3Ftab%3Dlistings");
  });

  it("allows a strict localhost bypass cookie through dashboard routes", async () => {
    enableLocalBypass();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxy(createRequest("/dashboard/listings/create", `${DEV_AUTH_BYPASS_COOKIE}=1`, { host: "localhost:3001" }));

    expect(response.headers.get("location")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not treat the bypass flag as a session without the cookie or on a public host", async () => {
    enableLocalBypass();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);

    const missingCookie = await proxy(createRequest("/dashboard", undefined, { host: "localhost:3001" }));
    const publicHost = await proxy(createRequest("/dashboard", `${DEV_AUTH_BYPASS_COOKIE}=1`, { host: "marketplace.example" }));

    expect(missingCookie.headers.get("location")).toBe("https://marketplace.example/login?next=%2Fdashboard");
    expect(publicHost.headers.get("location")).toBe("https://marketplace.example/login?next=%2Fdashboard");
  });

  it("keeps admin, account, and order routes on real auth when the bypass cookie is present", async () => {
    enableLocalBypass();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    for (const path of ["/admin/users", "/account/settings", "/dashboard/purchases", "/dashboard/sales", "/dashboard/payments"]) {
      const response = await proxy(createRequest(path, `${DEV_AUTH_BYPASS_COOKIE}=1`, { host: "localhost:3001" }));
      expect(response.headers.get("location")).toBe(`https://marketplace.example/login?next=${encodeURIComponent(path)}`);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not activate the bypass in production, on Vercel, or without the explicit flag", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);
    const cookie = `${DEV_AUTH_BYPASS_COOKIE}=1`;
    const host = { host: "localhost:3001" };

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("CI", "");
    vi.stubEnv("ALLOW_DEV_AUTH_BYPASS", "true");
    const production = await proxy(createRequest("/dashboard", cookie, host));

    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL", "1");
    const vercel = await proxy(createRequest("/dashboard", cookie, host));

    vi.stubEnv("VERCEL", "");
    vi.stubEnv("ALLOW_DEV_AUTH_BYPASS", "");
    const missingFlag = await proxy(createRequest("/dashboard", cookie, host));

    expect(production.headers.get("location")).toBe("https://marketplace.example/login?next=%2Fdashboard");
    expect(vercel.headers.get("location")).toBe("https://marketplace.example/login?next=%2Fdashboard");
    expect(missingFlag.headers.get("location")).toBe("https://marketplace.example/login?next=%2Fdashboard");
  });

  it("redirects auth routes only when the strict bypass cookie is present", async () => {
    enableLocalBypass();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxy(createRequest("/login?next=/dashboard/listings/create", `${DEV_AUTH_BYPASS_COOKIE}=1`, { host: "127.0.0.1:3001" }));

    expect(response.headers.get("location")).toBe("https://marketplace.example/dashboard/listings/create");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
