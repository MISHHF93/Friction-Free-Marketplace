const INTERNAL_PREFIX = /^\//;

export function isAllowedAdTarget(targetUrl: string, appOrigin: string): boolean {
  return resolveAdTarget(targetUrl, appOrigin) !== null;
}

export function resolveAdTarget(targetUrl: string, appOrigin: string): URL | null {
  const trimmed = targetUrl.trim();
  if (!trimmed || trimmed.length > 2000) return null;

  let base: URL;
  try {
    base = new URL(appOrigin);
  } catch {
    return null;
  }

  if (INTERNAL_PREFIX.test(trimmed) && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
    if (trimmed.includes("\\") || trimmed.includes("@")) return null;
    try {
      const resolved = new URL(trimmed, base);
      if (resolved.origin !== base.origin) return null;
      if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;
      if (resolved.username || resolved.password) return null;
      return resolved;
    } catch {
      return null;
    }
  }

  let outbound: URL;
  try {
    outbound = new URL(trimmed);
  } catch {
    return null;
  }
  if (outbound.protocol !== "https:") return null;
  if (outbound.username || outbound.password) return null;
  if (!outbound.hostname) return null;
  return outbound;
}

export function isOutboundAdTarget(url: URL, appOrigin: string) {
  try {
    return url.origin !== new URL(appOrigin).origin;
  } catch {
    return true;
  }
}
