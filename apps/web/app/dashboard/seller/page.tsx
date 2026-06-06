import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["seller-dashboard"]} related={[pageByKey["my-listings"], pageByKey.sales, pageByKey["ai-listing-creator"]]} />; }
