import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["trust-score"]} related={[pageByKey.verification, pageByKey["trust-safety"], pageByKey.settings]} />; }
