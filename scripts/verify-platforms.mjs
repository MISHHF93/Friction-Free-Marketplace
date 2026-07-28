import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const applicationId = "com.frictionfreemarketplace.app";
const applicationName = "Friction-Free Marketplace";
const requiredPaths = [
  "apps/web/app/layout.tsx",
  "apps/web/app/api/health/route.ts",
  "apps/web/components/native-bridge.tsx",
  "apps/web/app/.well-known/apple-app-site-association/route.ts",
  "apps/web/app/.well-known/assetlinks.json/route.ts",
  "apps/mobile/capacitor.config.ts",
  "apps/mobile/android/app/build.gradle",
  "apps/mobile/ios/App/App.xcodeproj/project.pbxproj",
  ".github/workflows/release-web.yml",
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
    failures.push(`Missing required single-repository platform file: ${path}`);
  }
}

const rootPackage = JSON.parse(await text("package.json"));
for (const workspace of ["apps/web", "apps/mobile", "packages/*"]) {
  if (!rootPackage.workspaces?.includes(workspace)) failures.push(`Root npm workspace is missing ${workspace}`);
}

const capacitorConfig = await text("apps/mobile/capacitor.config.ts");
const androidBuild = await text("apps/mobile/android/app/build.gradle");
const iosProject = await text("apps/mobile/ios/App/App.xcodeproj/project.pbxproj");
const nativeBridge = await text("apps/web/components/native-bridge.tsx");
const releaseMobile = await text(".github/workflows/release-mobile.yml");

for (const [label, content] of [
  ["Capacitor", capacitorConfig],
  ["Android", androidBuild],
  ["iOS", iosProject],
  ["mobile release workflow", releaseMobile],
]) {
  if (!content.includes(applicationId)) failures.push(`${label} does not use the canonical application ID ${applicationId}`);
}

if (!capacitorConfig.includes(`appName: "${applicationName}"`)) {
  failures.push(`Capacitor does not use the canonical application name ${applicationName}`);
}
if (!capacitorConfig.includes("CAPACITOR_SERVER_URL")) {
  failures.push("Capacitor must receive the hosted web origin through CAPACITOR_SERVER_URL");
}
if (!nativeBridge.includes("Capacitor.isNativePlatform()")) {
  failures.push("The hosted web application is missing its Capacitor native bridge");
}

const mobileFiles = [
  "apps/mobile/src/index.ts",
  "apps/mobile/capacitor.config.ts",
  "apps/mobile/android/app/src/main/assets/capacitor.config.json",
  "apps/mobile/ios/App/App/capacitor.config.json",
];
const secretNames = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "OPENAI_API_KEY",
  "RESEND_API_KEY",
  "MEILISEARCH_API_KEY",
];
for (const path of mobileFiles) {
  const content = await text(path);
  for (const secret of secretNames) {
    if (content.includes(secret)) failures.push(`${path} references server-only secret ${secret}`);
  }
}

if (failures.length) {
  console.error(`Platform verification failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

console.log("Single-repository platform contract verified:");
console.log("- Web: Next.js application and hosted backend");
console.log("- Android: Capacitor package sourced from apps/mobile/android");
console.log("- iOS: Capacitor package sourced from apps/mobile/ios");
console.log(`- Shared identity: ${applicationName} (${applicationId})`);
