import { afterEach, describe, expect, it, vi } from "vitest";
import { reportError, setErrorReporter } from "@/lib/observability/error-reporter";

describe("error reporter", () => {
  afterEach(() => {
    setErrorReporter(null);
    vi.restoreAllMocks();
  });

  it("logs a JSON payload by default and can be replaced", () => {
    const logged: unknown[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((value) => {
      logged.push(value);
    });
    reportError(new Error("listing failed"), { boundary: "app" });
    expect(spy).toHaveBeenCalledOnce();
    const payload = JSON.parse(String(logged[0])) as { type: string; message: string; context: { boundary: string } };
    expect(payload).toMatchObject({ type: "app_error", message: "listing failed", context: { boundary: "app" } });

    const custom = vi.fn();
    setErrorReporter(custom);
    const error = new Error("checkout failed");
    reportError(error, { route: "/listings/1" });
    expect(custom).toHaveBeenCalledWith(error, { route: "/listings/1" });
  });
});
