# Applications

Deployable surfaces live here.

- `web` (`@ffm/web`): the single unified mobile-first Next.js web application, installable PWA (`/manifest.webmanifest` + `/sw.js`), API backend, admin console, and Streamable HTTP MCP server (`/api/mcp`).
- `cron`: Railway scheduled-job runner container (`apps/cron/Dockerfile`, `apps/cron/run-job.mjs`) that triggers allowlisted `apps/web` cron endpoints.
