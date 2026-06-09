import type { DashboardLink } from "@/components/dashboard-shell";
import { can, type AdminPermission, type AdminRole } from "@/lib/admin/permissions";

export type AdminNavigationLink = DashboardLink & { permission: AdminPermission };

export const adminNavigationLinks: AdminNavigationLink[] = [
  { href: "/admin", label: "Platform overview", description: "Command center health", permission: "admin.access" },
  { href: "/admin/users", label: "Users", description: "Accounts, roles, status, trust", permission: "users.read" },
  { href: "/admin/listings", label: "Listings", description: "Policy queues and decisions", permission: "listings.moderate" },
  { href: "/admin/reports", label: "Reports", description: "User and content reports", permission: "reports.review" },
  { href: "/admin/disputes", label: "Disputes", description: "Escrow evidence and outcomes", permission: "disputes.decide" },
  { href: "/admin/transactions", label: "Transactions", description: "Escrow and ledger monitor", permission: "transactions.monitor" },
  { href: "/admin/fraud-alerts", label: "Fraud alerts", description: "Risk alerts and graph signals", permission: "fraud.review" },
  { href: "/admin/ai-tasks", label: "AI logs", description: "Agent runs, failures, cost", permission: "ai.monitor" },
  { href: "/admin/search-analytics", label: "Search analytics", description: "Demand and conversion", permission: "analytics.search" },
  { href: "/admin/revenue", label: "Revenue analytics", description: "GMV, take rate, refunds", permission: "analytics.revenue" },
  { href: "/admin/audit-logs", label: "Audit logs", description: "Sensitive action history", permission: "audit.read" },
  { href: "/admin/settings", label: "Settings", description: "Console policy and approval controls", permission: "workflows.manage" }
];

export const adminLinks: DashboardLink[] = adminNavigationLinks.map(({ permission: _permission, ...link }) => link);

export function getAdminLinksForRole(role: AdminRole) {
  return adminNavigationLinks
    .filter((link) => can(role, link.permission))
    .map(({ permission: _permission, ...link }) => link);
}
