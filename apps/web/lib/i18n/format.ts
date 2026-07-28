export const supportedLocales = ["en", "fr", "es", "de", "pt", "ar", "hi", "ja", "ko", "zh"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

const rtlLocales = new Set<SupportedLocale>(["ar"]);

export function resolveLocale(value?: string | null): SupportedLocale {
  if (!value) return "en";
  const candidates = value.split(",").map((entry) => entry.split(";")[0]?.trim()).filter(Boolean);

  for (const candidate of candidates) {
    try {
      const language = new Intl.Locale(candidate).language as SupportedLocale;
      if (supportedLocales.includes(language)) return language;
    } catch {
      // Continue to the next locale candidate.
    }
  }

  return "en";
}

export function directionForLocale(locale: string): "ltr" | "rtl" {
  return rtlLocales.has(resolveLocale(locale)) ? "rtl" : "ltr";
}

export function normalizeCurrencyCode(currency?: string | null) {
  const normalized = currency?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : "USD";
}

export function formatMoney(amount: number, currency?: string | null, locale?: string | null) {
  return new Intl.NumberFormat(resolveLocale(locale), {
    style: "currency",
    currency: normalizeCurrencyCode(currency),
    maximumFractionDigits: Math.abs(amount) % 1 === 0 ? 0 : 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumber(value: number, locale?: string | null) {
  return new Intl.NumberFormat(resolveLocale(locale)).format(Number.isFinite(value) ? value : 0);
}

export function formatDate(value: string | number | Date, locale?: string | null, timeZone?: string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return "—";
  return new Intl.DateTimeFormat(resolveLocale(locale), {
    dateStyle: "medium",
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}
