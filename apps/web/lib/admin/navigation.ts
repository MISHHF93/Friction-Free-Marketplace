import type { DashboardLink } from "@/components/dashboard-shell";

export const adminLinks: DashboardLink[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/fraud-alerts", label: "Fraud alerts" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/transactions", label: "Transactions" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/ai-tasks", label: "AI tasks" },
  { href: "/admin/search-analytics", label: "Search analytics" },
  { href: "/admin/revenue", label: "Revenue" },
  { href: "/admin/trust-overrides", label: "Trust overrides" },
  { href: "/admin/review-queue", label: "Review queue" },
  { href: "/admin/audit-logs", label: "Audit logs" }
];
