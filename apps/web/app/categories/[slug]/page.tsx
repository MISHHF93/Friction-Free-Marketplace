import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export function generateStaticParams() { return [{ slug: "electronics" }, { slug: "furniture" }, { slug: "vehicles" }]; }
export default function Page() { return <ExperiencePage page={pageByKey.category} related={[pageByKey.browse, pageByKey.search, pageByKey["saved-searches"]]} />; }
