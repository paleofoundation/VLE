import Link from "next/link";
import { ContaminantTypeList } from "../contaminant-type-list";
import { PageStructuredData } from "../page-structured-data";
import { publicPageMetadata } from "@/lib/seo";
import { seoJsonLdPages } from "@/lib/structured-data";

const page = seoJsonLdPages["/contaminants"];

export const metadata = publicPageMetadata("/contaminants", page.name, page.description);

export default function ContaminantsPage() {
  return (
    <main id="main-content" className="contaminantPage">
      <PageStructuredData path="/contaminants" />
      <section className="articleHero" aria-labelledby="contaminants-heading">
        <div>
          <p className="eyebrow eyebrowLight">Contaminant documentation</p>
          <h1 id="contaminants-heading">Three types. Three indexes. No invented results.</h1>
          <p>Suppliers can attach a file reference for heavy metals, PFAS, or microplastics to one physical lot or one compliance profile. Each type has a short explainer and a link to its Institute of Contaminant Standards index.</p>
        </div>
      </section>
      <section className="contaminantBody" aria-labelledby="type-heading">
        <div className="articleIntro">
          <p className="eyebrow">Documentation types</p>
          <h2 id="type-heading">A reference is not a qualification.</h2>
          <p>The claim VLE makes is a standard per category, with scheduled retesting of lots that enter that category. A document stores a file name and an https link. It does not store a concentration, a particle count, or a pass. Saving one does not mean every lot was measured.</p>
        </div>
        <ContaminantTypeList />
        <div className="articleClose">
          <p>Signed-in suppliers attach a reference from the supplier desk. This page does not accept files and does not list sample results.</p>
          <div className="actions">
            <Link className="button buttonDark" href="/supplier">Open the supplier desk</Link>
            <Link className="textLink" href="/articles/what-a-buyer-can-check">What a buyer can check</Link>
            <Link className="textLink" href="/for-suppliers">Supplier onboarding</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
