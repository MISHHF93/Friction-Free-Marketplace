const stripeScript = "https://js.stripe.com";
const posthogScript = "https://*.posthog.com";

export function scriptSource({ development, nonce }: { development: boolean; nonce?: string }) {
  const sources = ["'self'"];
  if (development) {
    sources.push("'unsafe-inline'", "'unsafe-eval'");
  } else if (nonce) {
    sources.push(`'nonce-${nonce}'`, "'strict-dynamic'");
  }
  sources.push(stripeScript, posthogScript);
  return sources.join(" ");
}


export function extraResourceOrigins(env: NodeJS.ProcessEnv = process.env) {
  const origins = new Set<string>();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (supabaseUrl) {
    try {
      origins.add(new URL(supabaseUrl).origin);
    } catch {
      // Ignore invalid local or placeholder URLs.
    }
  }
  if (env.NODE_ENV !== "production") {
    origins.add("http://127.0.0.1:54321");
    origins.add("http://localhost:54321");
    origins.add("ws://127.0.0.1:54321");
    origins.add("ws://localhost:54321");
  }
  return [...origins];
}

export function contentSecurityPolicy(options: { development: boolean; nonce?: string }) {
  const extraOrigins = extraResourceOrigins();
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    `script-src ${scriptSource(options)}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https: ${extraOrigins.filter((origin) => origin.startsWith("http")).join(" ")}`.trim(),
    "font-src 'self' data:",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.posthog.com ${extraOrigins.join(" ")}`.trim()
  ].join("; ");
}
