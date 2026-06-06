import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["offers"]} related={[pageByKey.messages, pageByKey.purchases, pageByKey.sales]} />; }
