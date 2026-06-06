import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["admin-fraud-alerts"]} related={[pageByKey["admin-users"], pageByKey["admin-listings"], pageByKey["admin-analytics"]]} />; }
