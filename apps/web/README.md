# Friction-Free Marketplace Web App

Production-oriented Next.js App Router starter for the marketplace experience.

## Stack

- Next.js App Router with TypeScript
- Tailwind CSS and shadcn/ui-style primitives
- Supabase SSR clients and auth middleware
- Zod and React Hook Form for client validation
- Stripe server helper and checkout route scaffold
- OpenAI SDK server helper and listing-copy route scaffold

## Structure

- `app/`: public routes, auth routes, protected dashboard shells, and API route scaffolds.
- `components/`: layout, listing, form, and shadcn/ui-style reusable components.
- `lib/`: environment parsing, marketplace fixture data, Supabase, Stripe, OpenAI, and validation helpers.
- `types/`: generated-compatible Supabase database types.
- `middleware.ts`: session refresh and protected-route redirects for dashboard/admin surfaces.

Copy `.env.example` to `.env.local` and provide the Supabase, Stripe, and OpenAI credentials before running the app.
