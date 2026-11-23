# Ownership handover

Moves Friction-Free Marketplace from its current owner to the new owner's accounts and redeploys it at **<https://frictionfree.co>**.

The new owner signs in to each service in this list. Nothing here can be created on their behalf: every provider requires its own account, login, and billing. This file says **what** to create and **where each value goes**. The full production rules (required variables, webhook events, cron schedules, migrations) are in [LAUNCH.md](LAUNCH.md).

Order matters: GitHub first, then the database, then the services that need its URL, then Vercel last.

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
| Vercel | <https://vercel.com/signup> | Hosting at frictionfree.co | 7, 8 |
| Domain registrar | wherever `frictionfree.co` is registered | DNS to Vercel and Resend; transfer the domain to Garfield there | 8 |
| Apple Developer | <https://developer.apple.com/programs/enroll/> | iOS app (later) | 10 |
| Google Play Console | <https://play.google.com/console/signup> | Android app (later) | 10 |

Use `garfieldgarwood45@gmail.com` as the Google OAuth consent-screen support email and developer contact (section 3), the Stripe account owner (section 4), and the Vercel account (section 8). For customer-facing `SUPPORT_EMAIL` and `RESEND_FROM_EMAIL`, prefer `support@frictionfree.co` / `no-reply@frictionfree.co` once the domain is verified in Resend; until then `SUPPORT_EMAIL` can be the Gmail address.

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
5. Set `NEXT_PUBLIC_OAUTH_PROVIDERS=google` in Vercel (step 8) and as a GitHub variable (step 9). It is baked in at build time, so redeploy after changing it.
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

## 7. Retire the old deployment

1. Current owner's Vercel: **Project → Settings → Domains** → remove `frictionfree.co` and `www.frictionfree.co` so the new project can claim them.
2. Then delete (or pause) the old Vercel project, and revoke its old API keys in Stripe, Supabase, Resend, and OpenAI once the new deployment is live.

## 8. Vercel (new deployment at frictionfree.co)

1. New owner's Vercel → **Add New → Project** → import `<new-owner>/Friction-Free-Marketplace`.
2. **Root Directory: repository root** (the root `vercel.json` runs `npm ci`, `npm run web:build`, and the crons). Framework: Next.js.
3. **Settings → Environment Variables (Production)**: every variable from steps 2–6 with real values, plus `NEXT_PUBLIC_APP_URL=https://frictionfree.co` and `NEXT_PUBLIC_OAUTH_PROVIDERS=google`. Leave `ALLOW_DEV_AUTH_BYPASS`, `FFM_E2E_AUTH`, `MARKETPLACE_DEMO_MODE`, and `FFM_MCP_ENABLED` **unset**; demo data and the local sign-in bypass are hard-disabled in production builds.
4. **Settings → Domains**: add `frictionfree.co` (and `www.frictionfree.co` redirecting to it). At the domain registrar, point DNS to Vercel as shown (A `76.76.21.21` for the apex, CNAME `cname.vercel-dns.com` for `www`), or move the nameservers to Vercel.
5. Hourly crons need Vercel Pro; see [LAUNCH.md → Hosting](LAUNCH.md#hosting) for the Hobby schedule.
6. **Account settings → Tokens**: create `VERCEL_TOKEN`. From **Project → Settings → General** copy `VERCEL_PROJECT_ID`, and from team settings `VERCEL_ORG_ID`. These let the *Release web* workflow deploy.

## 9. GitHub Actions secrets and variables

```bash
cp scripts/handover/github-config.template.env .env.handover.local   # gitignored
# fill it in, then:
gh auth login                                                        # as the new owner
node scripts/handover/apply-github-config.mjs <new-owner>/Friction-Free-Marketplace --dry-run
node scripts/handover/apply-github-config.mjs <new-owner>/Friction-Free-Marketplace
```

The script sets public values as Actions *variables* and the rest as *secrets*, skips empty lines, and refuses placeholder values. Mobile-store values can be added later.

## 10. Mobile apps (when publishing)

Same identity everywhere: `com.frictionfreemarketplace.app`. The new owner needs an Apple Developer account (`APPLE_TEAM_ID`, App Store Connect API key) and a Google Play Console account (upload keystore, service-account JSON, SHA-256 fingerprints). Set `CAPACITOR_SERVER_URL=https://frictionfree.co`. Details: [production-release.md](production-release.md).

## 11. Verify

1. `https://frictionfree.co/api/health` returns OK.
2. Sign up by email and by Google; log out and back in.
3. Create a listing; it appears in search.
4. Run the checks in [LAUNCH.md → After deploy](LAUNCH.md#after-deploy), including `PRODUCTION_URL=https://frictionfree.co npm run production:smoke`.
