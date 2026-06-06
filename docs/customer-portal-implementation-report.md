# Customer Portal Implementation Report

## Goal

Every organization should have a dedicated `/customer-portal` command center where authorized customers can manage their CareDroid deployment from one place.

## Scope

The first implementation will add a customer portal experience to the web app with tenant, organization, and role context visible throughout the UI. It will cover:

- Subscription overview
- Enabled products
- Enabled asset packs
- Organization profile
- Workspaces
- Users
- Integrations
- Invoices placeholder
- Support requests
- Release notes

## Access and isolation model

The portal is designed around these rules:

1. **Tenant scoped** — every displayed object is modeled as belonging to the active tenant/organization context.
2. **Organization aware** — organization identity, deployment region, plan, and workspace counts are shown as first-class portal context.
3. **Role aware** — privileged actions identify whether they are available to owner/admin/member/support roles.
4. **No cross-tenant visibility** — portal content is represented from a single active organization context and does not expose organization switching or global customer lists.

## Implementation plan

1. Add a route at `apps/web/app/customer-portal/page.tsx`.
2. Create portal-specific data structures in the route for the active CareDroid organization.
3. Render an overview dashboard with clear sections for every requested feature.
4. Surface access-control safeguards directly in the UI so customers understand tenant and role boundaries.
5. Link the top-level site navigation to `/customer-portal` so customers can reach the portal from one place.

## Acceptance mapping

The customer portal will satisfy “Customer can manage their CareDroid deployment from one place” by combining operational deployment status, subscription details, products, asset packs, workspaces, team access, integrations, billing placeholder, support, and release notes in a single organization-scoped page.
