import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { config, getSafeRedirectPath, isAuthRoute, isProtectedRoute, middleware } from "../../middleware";

const supabaseUrl = "https://example-project.supabase.co";
const anonKey = "test-anon-key";

function createRequest(pathname: string, cookie?: string) {
  return new NextRequest(new URL(pathname, "https://marketplace.example"), {
    headers: cookie ? { cookie } : undefined
  });
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

  it("does not invoke middleware for API routes", () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`);

    expect(matcher.test("/dashboard")).toBe(true);
    expect(matcher.test("/api/admin/users")).toBe(false);
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

    const response = await middleware(createRequest("/browse?q=camera"));

    expect(response.headers.get("location")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects protected routes to login when auth lookup fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);
    const fetchMock = vi.fn().mockRejectedValue(new Error("network unavailable"));
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", fetchMock);

    const response = await middleware(createRequest("/dashboard?tab=listings", createSupabaseAuthCookie("access-token")));

    expect(fetchMock).toHaveBeenCalledWith(`${supabaseUrl}/auth/v1/user`, expect.any(Object));
    expect(consoleErrorMock).toHaveBeenCalledWith("Middleware Supabase auth lookup failed", expect.any(Error));
    expect(response.headers.get("location")).toBe("https://marketplace.example/login?next=%2Fdashboard%3Ftab%3Dlistings");
  });
});
