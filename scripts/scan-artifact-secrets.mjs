import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const roots = process.argv.slice(2);
if (!roots.length) {
  console.error("Usage: node scripts/scan-artifact-secrets.mjs <file-or-directory> [...]");
  process.exit(2);
}

const forbidden = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "OPENAI_API_KEY",
  "RESEND_API_KEY",
  "MEILISEARCH_API_KEY",
  "ADMIN_WORKER_SECRET",
  "SCHEDULED_JOB_SECRET",
  "BEGIN PRIVATE KEY",
];
const findings = [];

function scan(path) {
  const stats = statSync(path);
  if (stats.isDirectory()) {
    for (const entry of readdirSync(path)) scan(resolve(path, entry));
    return;
  }
  if (stats.size > 250 * 1024 * 1024) return;
  const content = readFileSync(path);
  for (const marker of forbidden) {
    if (content.includes(Buffer.from(marker))) findings.push(`${path}: ${marker}`);
  }
}

for (const root of roots) scan(resolve(root));
if (findings.length) {
  console.error(`Potential server secret markers found:\n- ${findings.join("\n- ")}`);
  process.exit(1);
}
console.log(`Artifact secret scan passed for ${roots.length} target(s).`);
