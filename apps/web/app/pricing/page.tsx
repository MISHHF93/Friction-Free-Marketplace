import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey.pricing} related={[pageByKey["create-listing"], pageByKey["seller-dashboard"], pageByKey["how-it-works"]]} />; }
