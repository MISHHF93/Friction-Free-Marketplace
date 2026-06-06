import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["favorites"]} related={[pageByKey.search, pageByKey["saved-searches"], pageByKey.offers]} />; }
