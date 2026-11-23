#!/usr/bin/env node
// Loads GitHub Actions secrets and variables for the release workflows into a repository.
//
//   1. cp scripts/handover/github-config.template.env .env.handover.local   (gitignored)
//   2. Fill in the values.
//   3. node scripts/handover/apply-github-config.mjs <owner/repo> [--dry-run]
//
// Requires the GitHub CLI (`gh auth login`) signed in as an admin of <owner/repo>.
// Values are sent to GitHub over stdin and are never printed.
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

// Non-secret values go to Actions *variables*; everything else is a *secret*.
const VARIABLES = new Set([
  "PRODUCTION_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "NEXT_PUBLIC_OAUTH_PROVIDERS",
  "SUPPORT_EMAIL",
]);

const [repo, ...flags] = process.argv.slice(2);
const dryRun = flags.includes("--dry-run");
const file = resolve(flags.find((flag) => flag.startsWith("--file="))?.slice(7) ?? ".env.handover.local");

if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
  console.error("Usage: node scripts/handover/apply-github-config.mjs <owner/repo> [--dry-run] [--file=path]");
  process.exit(2);
}
if (!existsSync(file)) {
  console.error(`Missing ${file}. Copy scripts/handover/github-config.template.env to it and fill in the values.`);
  process.exit(2);
}

const entries = [];
for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq < 1) continue;
  const key = line.slice(0, eq).trim();
  let value = line.slice(eq + 1).trim();
  if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
  entries.push({ key, value });
}

let failed = 0;
let skipped = 0;
for (const { key, value } of entries) {
  const kind = VARIABLES.has(key) ? "variable" : "secret";
  if (!value) {
    skipped += 1;
    console.log(`skip   ${kind.padEnd(8)} ${key} (empty)`);
    continue;
  }
  if (/placeholder|your-|example\.com|^xxx/i.test(value)) {
    failed += 1;
    console.error(`refuse ${kind.padEnd(8)} ${key} (looks like a placeholder)`);
    continue;
  }
  if (dryRun) {
    console.log(`would  ${kind.padEnd(8)} ${key}`);
    continue;
  }
  const result = spawnSync("gh", [kind, "set", key, "--repo", repo], { input: value, encoding: "utf8", shell: false });
  if (result.status === 0) console.log(`set    ${kind.padEnd(8)} ${key}`);
  else {
    failed += 1;
    console.error(`FAIL   ${kind.padEnd(8)} ${key}: ${(result.stderr || result.error?.message || "").trim()}`);
  }
}

console.log(`\n${entries.length - skipped - failed} applied, ${skipped} skipped (empty), ${failed} failed${dryRun ? " [dry run]" : ""}.`);
process.exit(failed ? 1 : 0);
