import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["my-listings"]} related={[pageByKey["create-listing"], pageByKey["ai-listing-creator"], pageByKey.sales]} />; }
