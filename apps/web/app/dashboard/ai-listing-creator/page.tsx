import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["ai-listing-creator"]} related={[pageByKey["create-listing"], pageByKey["my-listings"], pageByKey["seller-dashboard"]]} />; }
