import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["admin-reports"]} related={[pageByKey["admin-users"], pageByKey["admin-disputes"], pageByKey["admin-fraud-alerts"]]} />; }
