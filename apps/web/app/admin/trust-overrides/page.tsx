import { notFound } from "next/navigation";
import { AdminFeaturePage } from "@/components/admin/admin-page";
import { getAdminPageConfig } from "@/lib/admin/platform";

export default function Page() {
  const config = getAdminPageConfig("trust-overrides");
  if (!config) notFound();
  return <AdminFeaturePage config={config} />;
}
