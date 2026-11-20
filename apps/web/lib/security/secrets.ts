export function safeEqualSecret(actual: string | null | undefined, expected: string | null | undefined) {
  if (!actual || !expected) return false;

  const maxLength = Math.max(actual.length, expected.length);
  let diff = actual.length ^ expected.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (actual.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }

  return diff === 0;
}

export function hasValidBearerSecret(request: Request, expectedSecret: string | null | undefined, alternateHeader?: string) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
  const alternate = alternateHeader ? request.headers.get(alternateHeader) : null;

  return safeEqualSecret(bearer, expectedSecret) || safeEqualSecret(alternate, expectedSecret);
}

export type JobAuthorization =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

/** Missing job secrets fail closed in every environment, including local dev. */
export function authorizeJobRequest(
  request: Request,
  secret: string | null | undefined,
  unauthorizedMessage: string,
  alternateHeader?: string
): JobAuthorization {
  const accepted = [secret, process.env.CRON_SECRET].filter((value): value is string => Boolean(value?.trim()));
  if (!accepted.length) {
    return { ok: false, status: 503, error: "Job secret is not configured." };
  }
  if (!accepted.some((value) => hasValidBearerSecret(request, value, alternateHeader))) {
    return { ok: false, status: 401, error: unauthorizedMessage };
  }
  return { ok: true };
}
