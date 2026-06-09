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
