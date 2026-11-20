import { isLocalDevelopmentHost } from "@/lib/auth/dev-bypass";

function originFrom(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Browser mutations are accepted only from the configured application origin.
 * Loopback aliases of that origin are included for local dev. The request's
 * Host and x-forwarded-host headers are not an allow-list: an attacker can
 * set both Origin and those headers to the same hostile site.
 */
export function trustedMutationOrigins(env: NodeJS.ProcessEnv = process.env) {
  const origins = new Set<string>();
  const configured = originFrom(env.NEXT_PUBLIC_APP_URL);
  if (configured) origins.add(configured);

  const localApp = configured ? new URL(configured) : null;
  const allowLoopback =
    (env.NODE_ENV !== "production" && env.VERCEL !== "1") ||
    (localApp ? isLocalDevelopmentHost(localApp.hostname) : false);

  if (allowLoopback) {
    const port = localApp && isLocalDevelopmentHost(localApp.hostname) ? localApp.port || "80" : "3001";
    origins.add(`http://localhost:${port}`);
    origins.add(`http://127.0.0.1:${port}`);
  }

  return origins;
}

export function isTrustedMutationOrigin(request: Request, env: NodeJS.ProcessEnv = process.env) {
  const origin = request.headers.get("origin");
  const requestedOrigin = originFrom(origin);
  if (!requestedOrigin) return false;
  return trustedMutationOrigins(env).has(requestedOrigin);
}
