export function isTrustedMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const requestedOrigin = new URL(origin).origin;
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
      : null;
    const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
    const requestOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : new URL(request.url).origin;
    return requestedOrigin === configuredOrigin || requestedOrigin === requestOrigin;
  } catch {
    return false;
  }
}
