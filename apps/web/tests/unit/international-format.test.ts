import { describe, expect, it } from "vitest";
import { directionForLocale, formatDate, formatMoney, normalizeCurrencyCode, resolveLocale } from "@/lib/i18n/format";

describe("international formatting", () => {
  it("resolves supported languages from browser preference lists", () => {
    expect(resolveLocale("fr-CA,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(resolveLocale("xx-invalid")).toBe("en");
  });

  it("identifies right-to-left locales", () => {
    expect(directionForLocale("ar-SA")).toBe("rtl");
    expect(directionForLocale("en-CA")).toBe("ltr");
  });

  it("formats ISO currencies without assuming a dollar symbol", () => {
    expect(formatMoney(1250, "EUR", "de")).toContain("1.250");
    expect(formatMoney(5000, "JPY", "ja")).toContain("5,000");
    expect(normalizeCurrencyCode("cad")).toBe("CAD");
  });

  it("returns a safe marker for invalid dates", () => {
    expect(formatDate("not-a-date", "en")).toBe("—");
  });
});
