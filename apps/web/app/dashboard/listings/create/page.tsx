import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["create-listing"]} related={[pageByKey["ai-listing-creator"], pageByKey["my-listings"], pageByKey.verification]} />; }
