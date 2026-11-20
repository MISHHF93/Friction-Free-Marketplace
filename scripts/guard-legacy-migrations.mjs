// Fails if the archived database/migrations folder could be mistaken for the live history.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const legacyDir = resolve("database/migrations");
const liveDir = resolve("supabase/migrations");
const problems = [];

if (existsSync(legacyDir)) {
  const legacy = readdirSync(legacyDir).filter((file) => file.endsWith(".sql")).sort();
  const guard = "0000_STOP_legacy_drafts_do_not_apply.sql";
  if (legacy.length && legacy[0] !== guard) problems.push(`database/migrations must start with ${guard} so an ordered run aborts.`);
  if (legacy.includes(guard) && !/raise exception/i.test(readFileSync(resolve(legacyDir, guard), "utf8"))) problems.push(`${guard} must raise an exception.`);
  const readme = resolve(legacyDir, "README.md");
  if (!existsSync(readme) || !/archived/i.test(readFileSync(readme, "utf8"))) problems.push("database/migrations/README.md must say the folder is archived.");
}

const live = readdirSync(liveDir).filter((file) => file.endsWith(".sql"));
const strays = live.filter((file) => !/^\d{14}_[a-z0-9_]+\.sql$/.test(file));
if (strays.length) problems.push(`supabase/migrations has files without a 14-digit timestamp: ${strays.join(", ")}`);

const config = resolve("supabase/config.toml");
if (existsSync(config) && /database\/migrations/.test(readFileSync(config, "utf8"))) problems.push("supabase/config.toml must not point at database/migrations.");

if (problems.length) {
  console.error(problems.map((problem) => `- ${problem}`).join("\n"));
  process.exit(1);
}
console.log(`Legacy migration guard OK (${live.length} live migrations in supabase/migrations).`);
