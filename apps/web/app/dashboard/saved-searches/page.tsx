import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["saved-searches"]} related={[pageByKey.search, pageByKey.favorites, pageByKey["buyer-dashboard"]]} />; }
