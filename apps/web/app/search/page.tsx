import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey.search} related={[pageByKey.browse, pageByKey["listing-detail"], pageByKey["saved-searches"]]} />; }
