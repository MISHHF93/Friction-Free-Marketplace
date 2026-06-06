import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["settings"]} related={[pageByKey.verification, pageByKey["trust-score"], pageByKey["buyer-dashboard"]]} />; }
