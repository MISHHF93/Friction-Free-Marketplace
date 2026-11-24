import { describe, expect, it } from "vitest";
import { getSafeRedirectPath, isSafeRelativePath } from "@/lib/auth/protected-routes";

describe("post-login redirect targets", () => {
  it.each(["/dashboard", "/listings/abc?offer=1", "/search?q=bike#top", "/"])("keeps same-origin path %s", (path) => {
    expect(isSafeRelativePath(path)).toBe(true);
    expect(getSafeRedirectPath(path)).toBe(path);
  });

  it.each([
    "//evil.example",
    "/\\evil.example",
    "/\\/evil.example",
    "\\\\evil.example",
    "https://evil.example",
    "javascript:alert(1)",
    "/dashboard\\..\\evil",
    "/\tevil.example",
    "dashboard",
    "",
  ])("rejects off-site or malformed target %j", (path) => {
    expect(isSafeRelativePath(path)).toBe(false);
    expect(getSafeRedirectPath(path)).toBe("/dashboard");
  });

  it("falls back for missing values", () => {
    expect(getSafeRedirectPath(null)).toBe("/dashboard");
    expect(getSafeRedirectPath(undefined, "/login")).toBe("/login");
  });
});
