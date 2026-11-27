import { redirect } from "next/navigation";
import { requireAdminPagePermission } from "@/lib/admin/permissions";

export default async function LegacyAnalyticsRedirect() {
  await requireAdminPagePermission("analytics.search", { loginNext: "/admin/analytics", deniedPath: "/admin" });
  redirect("/admin/search-analytics");
}
