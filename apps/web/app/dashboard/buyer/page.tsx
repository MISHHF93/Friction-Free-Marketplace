import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["buyer-dashboard"]} related={[pageByKey.messages, pageByKey.offers, pageByKey.purchases]} />; }
