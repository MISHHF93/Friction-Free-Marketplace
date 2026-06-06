import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["admin-transactions"]} related={[pageByKey["admin-disputes"], pageByKey["admin-analytics"], pageByKey["admin-users"]]} />; }
