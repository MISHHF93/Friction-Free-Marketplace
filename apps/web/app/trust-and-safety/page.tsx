import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["trust-safety"]} related={[pageByKey.verification, pageByKey["trust-score"], pageByKey["admin-fraud-alerts"]]} />; }
