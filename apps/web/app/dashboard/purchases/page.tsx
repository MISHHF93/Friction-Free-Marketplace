import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["purchases"]} related={[pageByKey.offers, pageByKey.favorites, pageByKey["trust-score"]]} />; }
