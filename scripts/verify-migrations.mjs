import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const directory = resolve("supabase/migrations");
const files = readdirSync(directory).filter((file) => file.endsWith(".sql")).sort();
const timestamps = files.map((file) => file.slice(0, 14));
const duplicates = timestamps.filter((timestamp, index) => timestamps.indexOf(timestamp) !== index);
if (duplicates.length) throw new Error(`Duplicate migration timestamps: ${[...new Set(duplicates)].join(", ")}`);

const limiter = files.find((file) => file.endsWith("_distributed_rate_limits.sql"));
if (!limiter) throw new Error("Distributed rate-limit migration is missing.");
const sql = readFileSync(resolve(directory, limiter), "utf8");
for (const required of [
  "enable row level security",
  "security definer",
  "set search_path = public",
  "revoke all",
  "grant execute",
]) {
  if (!sql.toLowerCase().includes(required)) throw new Error(`${limiter} is missing: ${required}`);
}
console.log(`Migration contract verified (${files.length} ordered SQL migrations).`);
