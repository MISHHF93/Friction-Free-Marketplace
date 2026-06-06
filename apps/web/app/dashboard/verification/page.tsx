import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["verification"]} related={[pageByKey["trust-score"], pageByKey.settings, pageByKey.pricing]} />; }
