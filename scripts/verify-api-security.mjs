import { readFileSync } from "node:fs";

const proxy = readFileSync("apps/web/proxy.ts", "utf8");
if (proxy.includes("(?!api|")) throw new Error("API routes are excluded from the centralized mutation policy.");
for (const marker of ["mutationMethods", "isTrustedMutationOrigin", "serverMutationPrefixes"]) {
  if (!proxy.includes(marker)) throw new Error(`Centralized API mutation policy is missing ${marker}.`);
}

const serverRoutes = [
  ["apps/web/app/api/stripe/webhooks/route.ts", ["webhooks.constructEvent", "STRIPE_WEBHOOK_SECRET"]],
  ["apps/web/app/api/search/sync/route.ts", ["hasValidBearerSecret", "SEARCH_SYNC_SECRET"]],
  ["apps/web/app/api/admin/trust-safety/workers/route.ts", ["hasValidBearerSecret", "ADMIN_WORKER_SECRET"]],
  ["apps/web/app/api/notifications/dispatch/route.ts", ["hasValidBearerSecret", "SCHEDULED_JOB_SECRET"]],
  ["apps/web/app/api/offers/expire/route.ts", ["hasValidBearerSecret", "SCHEDULED_JOB_SECRET"]],
];

for (const [path, markers] of serverRoutes) {
  const source = readFileSync(path, "utf8");
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${path} is exempt from origin checks but missing ${marker}.`);
  }
}

console.log(`API mutation policy verified (${serverRoutes.length} authenticated server-route exemptions).`);
