// Cross-platform dev launcher: binds Next.js to loopback and tells the app it is
// loopback-bound (FFM_BIND_HOST is read by lib/auth/dev-bypass.ts). Using a Node
// script instead of `VAR=value cmd` keeps `npm run dev` working on Windows cmd.exe.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const host = "127.0.0.1";
const port = process.env.PORT || "3001";

const child = spawn(
  process.execPath,
  [nextBin, "dev", "--webpack", "--hostname", host, "-p", port, ...process.argv.slice(2)],
  { stdio: "inherit", env: { ...process.env, FFM_BIND_HOST: host } },
);

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
