import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export function generateStaticParams() { return [{ id: "demo-road-bike" }, { id: "verified-sofa" }]; }
export default function Page() { return <ExperiencePage page={pageByKey["listing-detail"]} related={[pageByKey["seller-profile"], pageByKey.messages, pageByKey.offers]} />; }
