import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export function generateStaticParams() { return [{ id: "river-city-bikes" }, { id: "north-loop-home" }]; }
export default function Page() { return <ExperiencePage page={pageByKey["seller-profile"]} related={[pageByKey["listing-detail"], pageByKey.messages, pageByKey["trust-safety"]]} />; }
