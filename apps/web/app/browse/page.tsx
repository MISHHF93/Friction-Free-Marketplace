import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey.browse} related={[pageByKey.category, pageByKey.search, pageByKey["listing-detail"]]} />; }
