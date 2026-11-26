# Ownership handover

Moves Friction-Free Marketplace from its current owner to the new owner's accounts and redeploys it at **<https://frictionfree.co>**.

The new owner signs in to each service in this list. Nothing here can be created on their behalf: every provider requires its own account, login, and billing. This file says **what** to create and **where each value goes**. The full production rules (required variables, webhook events, cron schedules, migrations) are in [LAUNCH.md](LAUNCH.md).

Order matters: GitHub first, then the database, then the services that need its URL, then Railway last.

## Owner and accounts

- **Owner:** Garfield
- **Account email for every service:** `garfieldgarwood45@gmail.com`
- **GitHub:** `garfieldgarwood45-collab`
- **Production domain:** `frictionfree.co`

Sign up (or sign in) with that email at each service below, then follow the numbered section for it. Use **Continue with Google** with the same Gmail account wherever it is offered, so every account sits behind one login.

| Service | Sign up | Needed for | Section |
| --- | --- | --- | --- |
| GitHub | <https://github.com/signup> (account exists) | Code, CI, releases | 1, 9 |
| Supabase | <https://supabase.com/dashboard/sign-up> | Database, auth, file storage | 2 |
| Google Cloud | <https://console.cloud.google.com/> | "Continue with Google" sign-in | 3 |
| Stripe | <https://dashboard.stripe.com/register> | Payments, seller payouts (Connect) | 4 |
| Resend | <https://resend.com/signup> | Transactional email from `@frictionfree.co` | 5 |
| OpenAI | <https://platform.openai.com/signup> | AI listing and assistant features (optional) | 6 |
| Meilisearch Cloud | <https://cloud.meilisearch.com/register> | Fast search (optional) | 6 |
| PostHog | <https://app.posthog.com/signup> | Analytics (optional) | 6 |
| Railway | <https://railway.com/> | Hosting and scheduled jobs at frictionfree.co | 7, 8 |
| Domain registrar | wherever `frictionfree.co` is registered | DNS to Railway and Resend; transfer the domain to Garfield there | 8 |

Use `garfieldgarwood45@gmail.com` as the Google OAuth consent-screen support email and developer contact (section 3), the Stripe account owner (section 4), and the Railway account (section 8). For customer-facing `SUPPORT_EMAIL` and `RESEND_FROM_EMAIL`, prefer `support@frictionfree.co` / `no-reply@frictionfree.co` once the domain is verified in Resend; until then `SUPPORT_EMAIL` can be the Gmail address.

## 1. GitHub repository

1. Current owner: **Settings → General → Danger Zone → Transfer ownership** to `garfieldgarwood45-collab`. The invitation goes to `garfieldgarwood45@gmail.com` and must be accepted there.
2. GitHub redirects the old URL, but update local clones: `git remote set-url origin https://github.com/<new-owner>/Friction-Free-Marketplace.git`.
3. Actions secrets and variables are **not** carried over in a usable way. Recreate them in step 9.
4. Make sure the new owner's account has GitHub Actions billing enabled. CI cannot start on an account that is locked for billing.

## 2. Supabase (database, auth, storage)

1. Create a project in the new owner's Supabase organization (or transfer the existing project: **Organization settings → Projects → Transfer**; this keeps all data and users).
2. If new: apply every file in `supabase/migrations` in filename order (`supabase link` then `supabase db push`), then `scripts/prod/reference-data.sql`. Never apply `database/migrations`.
3. **Project settings → API**: copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. **Authentication → URL configuration**: Site URL `https://frictionfree.co`; Redirect URLs `https://frictionfree.co/auth/callback` and `https://frictionfree.co/**`.
5. Enable backups and point-in-time recovery before the first live charge.

## 3. Google sign-in

The login and signup pages show a "Continue with Google" button when `NEXT_PUBLIC_OAUTH_PROVIDERS=google`. The flow is Supabase OAuth: Google → Supabase → `https://frictionfree.co/auth/callback`.

1. In the new owner's [Google Cloud Console](https://console.cloud.google.com/), create a project (e.g. "Friction-Free Marketplace").
2. **APIs & Services → OAuth consent screen**: External; app name "Friction-Free Marketplace"; user support email and developer contact email = `garfieldgarwood45@gmail.com`; authorized domain `frictionfree.co`; privacy policy `https://frictionfree.co/privacy`; terms `https://frictionfree.co/terms`; scopes `openid`, `email`, `profile`. Publish the app (move it out of *Testing*), or only listed test users can sign in.
3. **Credentials → Create credentials → OAuth client ID** → *Web application*:
   - Authorized JavaScript origins: `https://frictionfree.co`
   - Authorized redirect URI: `https://<supabase-project-ref>.supabase.co/auth/v1/callback` (copy it from Supabase **Authentication → Providers → Google**)
4. In Supabase **Authentication → Providers → Google**: enable it and paste the Client ID and Client Secret.
5. Set `NEXT_PUBLIC_OAUTH_PROVIDERS=google` in Railway (step 8) and as a GitHub variable (step 9). It is baked in at build time, so redeploy after changing it.
6. Test: open `https://frictionfree.co/login`, choose Google, and confirm you land back signed in. The first Google sign-in also creates the account (signup).

Apple sign-in works the same way (`NEXT_PUBLIC_OAUTH_PROVIDERS=google,apple`) but needs an Apple Developer account and a Services ID.

## 4. Stripe (payments, Connect payouts)

1. Use the new owner's Stripe account with **Connect** enabled (Stripe can't move an account between people; either the current owner adds the new owner as Administrator and transfers account ownership in **Settings → Team**, or a new account is created and connected sellers re-onboard).
2. Copy `STRIPE_SECRET_KEY` (`sk_live_…`) and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_live_…`).
3. Create the two webhook endpoints listed in [LAUNCH.md → Stripe webhooks](LAUNCH.md#stripe-webhooks) on `https://frictionfree.co`, and copy `STRIPE_WEBHOOK_SECRET` and `STRIPE_CONNECT_WEBHOOK_SECRET`.

## 5. Email (Resend)

1. New owner's Resend account → **Domains → Add** `frictionfree.co` and add the DNS records it shows.
2. `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (e.g. `no-reply@frictionfree.co`), `SUPPORT_EMAIL` (e.g. `support@frictionfree.co`).

## 6. Optional services

Each degrades safely when unset.

| Service | Variables | Without it |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | AI assistant/listing helpers are off |
| Meilisearch (Cloud or self-host) | `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY` | Search uses the database |
| PostHog | `POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_HOST` | Analytics off |

Also generate random values for `CRON_SECRET` and `ADMIN_WORKER_SECRET` (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

## 7. Retire the previous deployment

1. If the domain is still attached to the previous host, remove `frictionfree.co` and `www.frictionfree.co` there after confirming the Railway service is ready to claim them.
2. Pause the previous deployment only after Railway is healthy. Revoke old API keys in Stripe, Supabase, Resend, and OpenAI once the Railway deployment is live.

## 8. Railway (production at frictionfree.co)

1. Sign in to Railway with Garfield's account, create a project, and connect `garfieldgarwood45-collab/Friction-Free-Marketplace` from GitHub. Deploy the `main` branch.
2. Keep the service root at the repository root so Railway detects the root `Dockerfile`. Add the production environment variables from [LAUNCH.md → Production environment](LAUNCH.md#production-environment) before the first deployment. The `NEXT_PUBLIC_*` values are needed at Docker build time as well as runtime.
3. Set `NEXT_PUBLIC_APP_URL=https://frictionfree.co` and `NEXT_PUBLIC_OAUTH_PROVIDERS=google`. Leave `ALLOW_DEV_AUTH_BYPASS`, `FFM_E2E_AUTH`, and `MARKETPLACE_DEMO_MODE` unset. Keep demo data and local sign-in bypass disabled in production. (`/api/mcp` is enabled by default for public read-only tools; set `FFM_MCP_ENABLED=0` if you want it off.)
4. In the web service settings, set the healthcheck path to `/api/health/ready`. Add `frictionfree.co` as a custom domain and follow the exact DNS records Railway displays for the project. Add `www.frictionfree.co` only if its redirect to the apex is configured at the registrar or DNS provider.
5. Create one scheduled service per route listed in [LAUNCH.md → Railway hosting](LAUNCH.md#railway-hosting). Point each service to this repository, set `RAILWAY_DOCKERFILE_PATH=/apps/cron/Dockerfile`, and configure its route, origin, bearer secret, and UTC schedule as listed there. The shared `CRON_SECRET` must also be set on the web service.
6. Link the Railway project to GitHub and verify that pushes to `main` create deployments. No Vercel token or Vercel project IDs are used.

## 9. GitHub Actions secrets and variables

```bash
cp scripts/handover/github-config.template.env .env.handover.local   # gitignored
# fill it in, then:
gh auth login                                                        # as the new owner
node scripts/handover/apply-github-config.mjs <new-owner>/Friction-Free-Marketplace --dry-run
node scripts/handover/apply-github-config.mjs <new-owner>/Friction-Free-Marketplace
```

The script sets public values as Actions *variables* and the rest as *secrets*, skips empty lines, and refuses placeholder values. Mobile-store values can be added later.

## 10. Installable PWA

There is no native Android/iOS app or store release. The Railway-hosted Next.js app is the mobile-first PWA. Verify its manifest, icons, offline page, and install flow on current iOS Safari and Android Chrome after deployment. No Apple Developer or Google Play account is required.

## 11. Verify

1. `https://frictionfree.co/api/health` returns OK.
2. Sign up by email and by Google; log out and back in.
3. Create a listing; it appears in search.
4. Run the checks in [LAUNCH.md → After deploy](LAUNCH.md#after-deploy), including `PRODUCTION_URL=https://frictionfree.co npm run production:smoke`.
