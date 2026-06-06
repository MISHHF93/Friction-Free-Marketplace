import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["sales"]} related={[pageByKey.offers, pageByKey["my-listings"], pageByKey["seller-dashboard"]]} />; }
