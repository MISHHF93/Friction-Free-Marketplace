# Production rollback runbook

Every PWA/container release must record the Git commit and backend migration level in the release evidence.

## Web and container

1. Stop promotion when readiness, smoke journeys, error rate, or payment reconciliation fails.
2. In Railway, roll the web service back to the last healthy deployment from its deployment history.
3. If deploying from GHCR instead, deploy the previous `ghcr.io/<owner>/<repository>:<commit-sha>` image. Never use a mutable tag as rollback identity.
4. Verify `/api/health`, `/api/health/ready`, authentication, search, and a non-capturing Stripe test journey.
5. Record the failed and restored commit IDs, timestamps, owner, observed impact, and evidence links.

## Database

- Prefer forward-compatible corrective migrations. Do not automatically reverse a migration that may have received production writes.
- Before release, confirm the previous application version remains compatible with the new schema.
- If compatibility is impossible, disable the affected feature, preserve data, and apply an reviewed forward fix.

## PWA

- The installed PWA loads the hosted application, so restore the Railway web service first.
- Verify manifest, icons, authentication, and offline fallback in a mobile browser after rollback.

## Ownership

The release operator owns rollback execution. Payments, authentication, webhook, or data-integrity failures require an incident record and reconciliation before promotion resumes.
