import { writeFile } from "node:fs/promises";

const originInput = process.env.PRODUCTION_URL ?? process.argv[2];
const outputPath = process.env.SMOKE_OUTPUT ?? "production-smoke-evidence.json";
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 10_000);

if (!originInput) {
  throw new Error("Provide PRODUCTION_URL or pass the production origin as the first argument.");
}

const origin = new URL(originInput);
if (origin.protocol !== "https:" || origin.hostname === "marketplace.example.com") {
  throw new Error("Production smoke tests require a real HTTPS origin.");
}
origin.pathname = "/";
origin.search = "";
origin.hash = "";

const checks = [];

async function fetchCheck(path, validate) {
  const startedAt = performance.now();
  try {
    const response = await fetch(new URL(path, origin), {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "ffm-production-smoke/1.0" },
    });
    const body = await response.text();
    const result = await validate(response, body);
    checks.push({
      path,
      passed: true,
      status: response.status,
      latencyMs: Math.round(performance.now() - startedAt),
      detail: result ?? "ok",
    });
  } catch (error) {
    checks.push({
      path,
      passed: false,
      latencyMs: Math.round(performance.now() - startedAt),
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

const expectSuccess = (response) => {
  if (!response.ok) throw new Error(`Expected a successful response, received HTTP ${response.status}.`);
};

await fetchCheck("/api/health", (response, body) => {
  expectSuccess(response);
  const payload = JSON.parse(body);
  if (payload.status !== "ok") throw new Error("Health response did not report ok.");
  return "application healthy";
});

await fetchCheck("/api/health/ready", (response, body) => {
  expectSuccess(response);
  const payload = JSON.parse(body);
  if (payload.status !== "ready") throw new Error("Readiness response did not report ready.");
  return "runtime configuration ready";
});

await fetchCheck("/manifest.webmanifest", (response, body) => {
  expectSuccess(response);
  const manifest = JSON.parse(body);
  if (manifest.name !== "Friction-Free Marketplace" || manifest.display !== "standalone") {
    throw new Error("PWA manifest identity or display mode is invalid.");
  }
  return "PWA manifest valid";
});

await fetchCheck("/.well-known/apple-app-site-association", (response, body) => {
  expectSuccess(response);
  const association = JSON.parse(body);
  if (!association.applinks?.details?.length) throw new Error("Apple associated-domain details are empty.");
  return "Apple universal links configured";
});

await fetchCheck("/.well-known/assetlinks.json", (response, body) => {
  expectSuccess(response);
  const association = JSON.parse(body);
  if (!Array.isArray(association) || !association[0]?.target?.sha256_cert_fingerprints?.length) {
    throw new Error("Android signing fingerprints are empty.");
  }
  return "Android app links configured";
});

for (const [path, marker] of [
  ["/", "A premium marketplace"],
  ["/browse", "marketplace"],
  ["/assistant", "AI help with clear limits"],
  ["/privacy", "Privacy policy"],
  ["/terms", "Terms"],
  ["/contact", "Contact"],
  ["/offline", "Reconnect to continue"],
]) {
  await fetchCheck(path, (response, body) => {
    expectSuccess(response);
    if (!body.toLowerCase().includes(marker.toLowerCase())) {
      throw new Error(`Expected page marker "${marker}" was not found.`);
    }
    if (!response.headers.get("content-security-policy")) {
      throw new Error("Content-Security-Policy header is missing.");
    }
    return `page and security headers valid`;
  });
}

const evidence = {
  schemaVersion: 1,
  origin: origin.origin,
  testedAt: new Date().toISOString(),
  passed: checks.every((check) => check.passed),
  summary: {
    total: checks.length,
    passed: checks.filter((check) => check.passed).length,
    failed: checks.filter((check) => !check.passed).length,
    slowestMs: Math.max(...checks.map((check) => check.latencyMs)),
  },
  checks,
};

await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(JSON.stringify(evidence, null, 2));

if (!evidence.passed) process.exitCode = 1;
