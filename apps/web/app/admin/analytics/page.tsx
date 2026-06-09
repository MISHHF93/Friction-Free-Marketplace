import { ExperiencePage } from "@/components/experience-page";
import { requireAdminPagePermission } from "@/lib/admin/permissions";
import { pageByKey } from "@/lib/page-data";

export default async function Page() {
  await requireAdminPagePermission("analytics.search", { loginNext: "/admin/analytics", deniedPath: "/admin" });

  return <ExperiencePage page={pageByKey["admin-analytics"]} related={[pageByKey["admin-overview"], pageByKey["admin-transactions"], pageByKey["admin-fraud-alerts"]]} />;
}
