const rawUrl = process.env.CAPACITOR_SERVER_URL;

if (!rawUrl) {
  throw new Error("CAPACITOR_SERVER_URL is required for a release build.");
}

const serverUrl = new URL(rawUrl);
if (serverUrl.protocol !== "https:") {
  throw new Error("CAPACITOR_SERVER_URL must use HTTPS for a release build.");
}

if (serverUrl.hostname === "marketplace.example.com") {
  throw new Error("Replace the example hostname before creating a release build.");
}

if (serverUrl.pathname !== "/" || serverUrl.search || serverUrl.hash) {
  throw new Error("CAPACITOR_SERVER_URL must be an origin without a path, query, or fragment.");
}

console.log(`Release origin validated: ${serverUrl.origin}`);
