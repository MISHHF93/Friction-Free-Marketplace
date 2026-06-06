import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["admin-listings"]} related={[pageByKey["admin-users"], pageByKey["admin-reports"], pageByKey["admin-fraud-alerts"]]} />; }
