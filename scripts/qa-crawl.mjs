#!/usr/bin/env node
// Crash crawl: opens every static route (plus a few sample dynamic ones) signed out and
// signed in, and fails on 5xx responses, uncaught browser errors, console errors, or an
// error-boundary screen.
//
//   npm run web:dev            # in another terminal; set ALLOW_DEV_AUTH_BYPASS=true and
//                              # MARKETPLACE_DEMO_MODE=true in apps/web/.env.local for signed-in pages
//   npm run qa:crawl [-- --base=http://127.0.0.1:3001] [-- --routes=/,/search]
import { readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, sep } from "node:path";

const require = createRequire(join(process.cwd(), "apps/web/package.json"));
const { chromium } = require("@playwright/test");

const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const base = arg("base") ?? "http://127.0.0.1:3001";
const appDir = join(process.cwd(), "apps/web/app");

function staticRoutes(dir) {
  const routes = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!entry.startsWith("[") && !entry.startsWith("(") && !entry.startsWith("_")) routes.push(...staticRoutes(full));
    } else if (entry === "page.tsx") {
      const path = relative(appDir, dir).split(sep).join("/");
      routes.push(path ? `/${path}` : "/");
    }
  }
  return routes;
}

const routes = arg("routes")?.split(",") ?? [
  ...staticRoutes(appDir).sort(),
  "/listings/verified-road-bike",
  "/categories/outdoors",
  "/listings/does-not-exist",
];
const ignore = [/status of (401|403|404)/, /favicon/, /React DevTools/, /\[HMR\]/, /posthog/i];

const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined });
let problems = 0;
for (const mode of ["signed-out", "signed-in"]) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  if (mode === "signed-in") await context.addCookies([{ name: "ffm-dev-auth-bypass", value: "1", url: base }]);
  const page = await context.newPage();
  let errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message.split("\n")[0]}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !ignore.some((pattern) => pattern.test(message.text()))) {
      errors.push(`console: ${message.text().split("\n")[0].slice(0, 200)}`);
    }
  });
  for (const route of routes) {
    errors = [];
    let status;
    try {
      status = (await page.goto(base + route, { waitUntil: "load", timeout: 120_000 }))?.status();
      await page.waitForTimeout(1200);
    } catch (error) {
      // A server redirect that lands mid-navigation is not a crash.
      if (/interrupted by another navigation/.test(error.message)) continue;
      status = `navigation error: ${error.message.split("\n")[0]}`;
    }
    const boundary = await page
      .evaluate(() => /Something went wrong|could not load/i.test(document.body?.innerText ?? "")
        || [...document.querySelectorAll("button")].some((button) => button.textContent?.trim() === "Try again"))
      .catch(() => false); // page navigated away (redirect) while checking
    const bad = boundary || errors.length > 0 || typeof status === "string" || (status ?? 0) >= 500;
    if (bad) problems += 1;
    console.log(`${bad ? "FAIL" : "ok  "} ${mode.padEnd(10)} ${route} ${status ?? ""}${boundary ? " error-screen" : ""} ${[...new Set(errors)].slice(0, 3).join(" | ")}`);
  }
  await context.close();
}
await browser.close();
console.log(`\n${problems} problem(s) across ${routes.length} routes x 2 modes`);
process.exit(problems ? 1 : 0);
