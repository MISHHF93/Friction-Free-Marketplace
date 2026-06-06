import { ExperiencePage } from "@/components/experience-page";
import { pageByKey } from "@/lib/page-data";
export default function Page() { return <ExperiencePage page={pageByKey["login-signup"]} related={[pageByKey["buyer-dashboard"], pageByKey["seller-dashboard"], pageByKey.verification]} />; }
