# Friction-Free Marketplace

Friction-Free Marketplace is an AI-powered consumer commerce platform designed around safe discovery, trusted transactions, governed AI agents, escrow-backed payments, market intelligence, and a future partner commerce operating system.

## Repository architecture

This repository is structured as a domain-aligned monorepo:

- `apps/`: user-facing and operator-facing applications.
- `services/`: independently owned backend service domains.
- `packages/`: shared UI, domain, API, telemetry, config, and testing packages.
- `contracts/`: GraphQL, OpenAPI, Protobuf, and event contracts.
- `data/`: migrations, warehouse models, data quality checks, and seed data.
- `ai/`: prompts, evals, tool schemas, policies, and memory definitions.
- `infra/`: infrastructure as code, Kubernetes manifests, observability, and security configuration.
- `ops/`: runbooks, playbooks, and operational policies.
- `docs/`: product, technical, data, trust, AI, commerce, UX, and implementation blueprints.

See `docs/product-requirements-document.md` for the complete product requirements document and `docs/implementation-blueprint.md` for the complete implementation blueprint and the intended build sequence. See `docs/backend-architecture-supabase-nextjs.md` for the implementation-ready backend design using Next.js Server Actions, Supabase, Stripe Connect, OpenAI, search, Resend, and PostHog.
