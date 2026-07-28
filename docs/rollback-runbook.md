# Production rollback runbook

Every web, container, Android, and iOS release must record the same Git commit, backend migration level, version, and build number in the release evidence.

## Web and container

1. Stop promotion when readiness, smoke journeys, error rate, or payment reconciliation fails.
2. In Vercel, promote the last healthy immutable deployment.
3. On container platforms, deploy the previous `ghcr.io/<owner>/<repository>:<commit-sha>` image. Never use a mutable tag as rollback identity.
4. Verify `/api/health`, `/api/health/ready`, authentication, search, and a non-capturing Stripe test journey.
5. Record the failed and restored commit IDs, timestamps, owner, observed impact, and evidence links.

## Database

- Prefer forward-compatible corrective migrations. Do not automatically reverse a migration that may have received production writes.
- Before release, confirm the previous application version remains compatible with the new schema.
- If compatibility is impossible, disable the affected feature, preserve data, and apply an reviewed forward fix.

## Mobile

- Mobile packages point to the hosted application, so restore the backend first.
- Pause phased release in Play Console or App Store Connect when native-shell behavior is responsible.
- Increment the build number for every replacement package; store artifacts are never overwritten.

## Ownership

The release operator owns rollback execution. Payments, authentication, webhook, or data-integrity failures require an incident record and reconciliation before promotion resumes.
