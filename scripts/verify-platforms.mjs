import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const requiredPaths = [
  "apps/web/app/layout.tsx",
  "apps/web/app/manifest.ts",
  "apps/web/public/sw.js",
  "apps/web/app/api/health/route.ts",
  "apps/web/app/api/mcp/route.ts",
  "apps/web/app/.well-known/mcp/route.ts",
  "apps/cron/run-job.mjs",
  ".github/workflows/release-web.yml",
];

const forbiddenPaths = [
  "apps/mobile",
  ".github/workflows/release-mobile.yml",
];

const failures = [];

async function text(path) {
  return readFile(join(root, path), "utf8");
}

for (const path of requiredPaths) {
  try {
    await access(join(root, path));
  } catch {
    failures.push(`Missing required platform file: ${path}`);
  }
}

for (const path of forbiddenPaths) {
  try {
    await access(join(root, path));
    failures.push(`Duplicate mobile native target must not exist: ${path}`);
  } catch {
    // Expected: only the unified web PWA + MCP application exists.
  }
}

const rootPackage = JSON.parse(await text("package.json"));
for (const workspace of ["apps/web", "packages/*"]) {
  if (!rootPackage.workspaces?.includes(workspace)) failures.push(`Root npm workspace is missing ${workspace}`);
}
if (rootPackage.workspaces?.includes("apps/mobile")) {
  failures.push("Root npm workspace must not include a separate apps/mobile application");
}

const webPackage = JSON.parse(await text("apps/web/package.json"));
for (const dependency of Object.keys(webPackage.dependencies ?? {})) {
  if (dependency.startsWith("@capacitor/")) {
    failures.push(`apps/web must not depend on native Capacitor package ${dependency}`);
  }
}

const manifestSource = await text("apps/web/app/manifest.ts");
if (!manifestSource.includes('display: "standalone"')) {
  failures.push("PWA manifest must configure standalone install display mode");
}

const mcpDiscoverySource = await text("apps/web/app/.well-known/mcp/route.ts");
const mcpToolsSource = await text("apps/web/lib/mcp/tools.ts");
if (!mcpDiscoverySource.includes("getMcpDiscoveryPayload") || !mcpToolsSource.includes('endpoint: "/api/mcp"')) {
  failures.push("MCP discovery route must advertise /api/mcp");
}

if (failures.length) {
  console.error(`Platform verification failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

console.log("Single-application platform contract verified:");
console.log("- App: Next.js installable web/mobile PWA + backend (apps/web)");
console.log("- MCP: Streamable HTTP server (/api/mcp) and discovery (/.well-known/mcp)");
console.log("- Cron: Railway scheduled job runner (apps/cron)");
