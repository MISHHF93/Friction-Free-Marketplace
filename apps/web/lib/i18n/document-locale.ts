const shippedLanguages = new Set(["en"]);

export function documentLocale(locale: string | null | undefined, acceptLanguage: string | null | undefined) {
  const requested = (locale || acceptLanguage?.split(",")[0] || "en").trim().toLowerCase();
  const language = requested.split(/[-_]/)[0] || "en";
  return {
    lang: shippedLanguages.has(language) ? language : "en",
    dir: "ltr" as const
  };
}
