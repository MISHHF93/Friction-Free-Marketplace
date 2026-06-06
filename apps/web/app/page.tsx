import { ExperiencePage } from "@/components/experience-page";
import { PageIndex } from "@/components/page-index";
import { adminPages, dashboardPages, pageByKey, publicPages } from "@/lib/page-data";

export default function HomePage() {
  return (
    <>
      <ExperiencePage page={pageByKey.home} related={[pageByKey.browse, pageByKey["ai-listing-creator"], pageByKey["trust-safety"]]} />
      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <PageIndex title="Public pages" pages={publicPages} />
        <PageIndex title="User dashboard" pages={dashboardPages} />
        <PageIndex title="Admin" pages={adminPages} />
      </section>
    </>
  );
}
