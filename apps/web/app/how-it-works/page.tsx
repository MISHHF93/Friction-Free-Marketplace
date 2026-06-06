import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["how-it-works"]} related={[pageByKey.pricing, pageByKey["trust-safety"], pageByKey["login-signup"]]} />; }
