import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const policy = JSON.parse(readFileSync(new URL("../security/production-audit-allowlist.json", import.meta.url), "utf8"));
const accepted = new Map(policy.acceptedAdvisories.map((item) => [item.id, item]));
const audit = process.platform === "win32"
  ? spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm audit --omit=dev --json"], { encoding: "utf8" })
  : spawnSync("npm", ["audit", "--omit=dev", "--json"], { encoding: "utf8" });

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error(audit.stderr || "Unable to parse npm audit output.");
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const unaccepted = [];
const observed = new Set();

for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  if (!["high", "critical"].includes(vulnerability.severity)) continue;
  const advisoryIds = (vulnerability.via ?? [])
    .filter((item) => typeof item === "object" && item.url)
    .map((item) => item.url.split("/").pop());
  if (!advisoryIds.length) continue;

  for (const id of advisoryIds) {
    observed.add(id);
    const exception = accepted.get(id);
    if (!exception || exception.expires < today || exception.package !== vulnerability.name) {
      unaccepted.push(`${vulnerability.name}: ${id}`);
    }
  }
}

for (const [id, exception] of accepted) {
  if (exception.expires < today) unaccepted.push(`${exception.package}: expired acceptance ${id}`);
}

if (unaccepted.length) {
  console.error(`Unaccepted high/critical production advisories:\n- ${[...new Set(unaccepted)].join("\n- ")}`);
  process.exit(1);
}

console.log(`Production dependency policy passed (${observed.size} accepted advisories, 0 unaccepted high/critical advisories).`);
