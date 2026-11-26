const allowedPaths = new Set([
  "/api/notifications/dispatch",
  "/api/offers/expire",
  "/api/search/sync",
  "/api/payments/reconcile",
  "/api/payments/expire-checkouts",
  "/api/payments/auto-release"
]);

const appOrigin = process.env.RAILWAY_APP_URL;
const jobPath = process.env.RAILWAY_JOB_PATH;
const cronSecret = process.env.CRON_SECRET;

if (!appOrigin || !jobPath || !cronSecret) {
  throw new Error("RAILWAY_APP_URL, RAILWAY_JOB_PATH, and CRON_SECRET are required.");
}

const appUrl = new URL(appOrigin);
if (appUrl.protocol !== "https:" || appUrl.pathname !== "/" || appUrl.search || appUrl.hash) {
  throw new Error("RAILWAY_APP_URL must be an HTTPS origin without a path or query.");
}
if (!allowedPaths.has(jobPath)) {
  throw new Error("RAILWAY_JOB_PATH is not an allowed scheduled endpoint.");
}

const response = await fetch(new URL(jobPath, appUrl), {
  method: "GET",
  headers: { authorization: `Bearer ${cronSecret}`, accept: "application/json" }
});
await response.arrayBuffer();

if (!response.ok) {
  throw new Error(`Scheduled endpoint ${jobPath} returned HTTP ${response.status}.`);
}

console.log(`Scheduled endpoint ${jobPath} completed with HTTP ${response.status}.`);
