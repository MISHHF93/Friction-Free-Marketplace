import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["admin-disputes"]} related={[pageByKey["admin-transactions"], pageByKey["admin-reports"], pageByKey["admin-users"]]} />; }
