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

export function contentSecurityPolicy(options: { development: boolean; nonce?: string }) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    `script-src ${scriptSource(options)}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.posthog.com"
  ].join("; ");
}
