const rtlLanguages = new Set(["ar", "he", "fa", "ur"]);

export function documentLocale(locale: string | null | undefined, acceptLanguage: string | null | undefined) {
  const requested = (locale || acceptLanguage?.split(",")[0] || "en").trim().toLowerCase();
  const language = requested.split(/[-_]/)[0] || "en";
  const safeLanguage = /^[a-z]{2,3}$/.test(language) ? language : "en";
  return {
    lang: safeLanguage,
    dir: rtlLanguages.has(safeLanguage) ? "rtl" as const : "ltr" as const
  };
}
