import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

// Runs the r10 lifecycle guards against a LOCAL Supabase database:
// abandoned checkout frees the listing, deletion refused with open orders,
// open orders block seller sold/archive, admin holds cannot be republished,
// offers close with the listing, suspended members are blocked.
// Set FFM_LOCAL_DB_CONTAINER (docker) or FFM_LOCAL_DB_URL. Never a live database.
const container = process.env.FFM_LOCAL_DB_CONTAINER;
const dbUrl = process.env.FFM_LOCAL_DB_URL;

test.describe("lifecycle guards in the database", () => {
  test.skip(!container && !dbUrl, "needs a local Supabase database");
  test.skip(({ browserName }) => browserName !== "chromium", "database check runs once");

  test("r10 lifecycle SQL checks all pass", () => {
    const file = resolve(__dirname, "../../../../supabase/tests/r10_lifecycle.sql");
    if (dbUrl && /supabase\.co|pooler/i.test(dbUrl)) throw new Error("Refusing to run against a hosted database.");
    const output = container
      ? execFileSync("bash", ["-c", `docker exec -i ${container} psql -U postgres -v ON_ERROR_STOP=1 -q -t < "${file}"`], { encoding: "utf8" })
      : execFileSync("psql", [dbUrl!, "-v", "ON_ERROR_STOP=1", "-q", "-t", "-f", file], { encoding: "utf8" });
    const passes = output.split("\n").filter((line) => line.includes("PASS"));
    expect(passes).toHaveLength(6);
  });
});
