// Runs once when the Next.js server starts (Node and Edge), before any route handler.
export async function register() {
  // Install plain-language zod fallback messages for every server-side schema, including API routes.
  await import("./lib/validation/zod-messages");
}
