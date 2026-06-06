import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["admin-users"]} related={[pageByKey["admin-listings"], pageByKey["admin-reports"], pageByKey["admin-fraud-alerts"]]} />; }
